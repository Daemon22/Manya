/**
 * @manya-os/anonymize — sensitive metadata stripping for objects/JSON.
 *
 * Walks a JSON-like object and removes or scrubs keys that are commonly
 * sensitive (author, GPS coordinates, device IDs, etc.). Useful for
 * EXIF-like document metadata, JSON-LD provenance, and HTTP headers.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { AnonymizeError } from '../errors.js';

/** Keys (case-insensitive) that are stripped by default. */
export const SENSITIVE_METADATA_KEYS = [
  'author', 'creator', 'createdBy', 'lastModifiedBy', 'owner',
  'gps', 'gpslatitude', 'gpslongitude', 'gpsaltitude', 'gpsposition',
  'location', 'latlong', 'coordinates', 'geolocation',
  'deviceid', 'deviceid', 'serialnumber', 'imei', 'imsi', 'meid',
  'macaddress', 'ssid', 'bssid',
  'userid', 'username', 'useragent', 'ip', 'ipaddress', 'remoteaddr',
  'phonenumber', 'email', 'address', 'birthdate', 'dob',
  'exif', 'xmp', 'iptc',
  'signature', 'signedby',
  'token', 'apikey', 'secret', 'password', 'sessionid',
] as const;

export interface MetadataScrubOptions {
  /** Additional keys to strip (merged with defaults). */
  additionalKeys?: string[];
  /** Replace with `[redacted]` instead of deleting. */
  redactInsteadOfDelete?: boolean;
  /** Keys to preserve even if they match the denylist. */
  allowlist?: string[];
}

/** Returns true if a key name should be scrubbed. */
export function isSensitiveKey(key: string, opts: MetadataScrubOptions = {}): boolean {
  const lower = key.toLowerCase();
  const allow = new Set((opts.allowlist ?? []).map(k => k.toLowerCase()));
  if (allow.has(lower)) return false;
  const deny = new Set<string>(SENSITIVE_METADATA_KEYS.map(k => k.toLowerCase()));
  for (const k of opts.additionalKeys ?? []) deny.add(k.toLowerCase());
  if (deny.has(lower)) return true;
  // Substring match for compound names like `userGpsLatitude`.
  for (const d of deny) {
    if (lower.length > d.length && lower.includes(d)) return true;
  }
  return false;
}

/**
 * Deeply scrub a metadata object. Returns a new object; the input is
 * not mutated.
 */
export function scrubMetadata(
  meta: unknown,
  opts: MetadataScrubOptions = {},
): unknown {
  if (meta === null || meta === undefined) return meta;
  if (typeof meta !== 'object') return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(v => scrubMetadata(v, opts));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (isSensitiveKey(k, opts)) {
      if (opts.redactInsteadOfDelete) out[k] = '[redacted]';
      // else: drop
    } else {
      out[k] = scrubMetadata(v, opts);
    }
  }
  return out;
}

/** Diff two metadata objects — returns keys only in `a`, only in `b`, and changed. */
export function diffMetadata(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): { onlyInA: string[]; onlyInB: string[]; changed: string[] } {
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];
  const changed: string[] = [];
  const ak = new Set(Object.keys(a));
  const bk = new Set(Object.keys(b));
  for (const k of ak) {
    if (!bk.has(k)) onlyInA.push(k);
    else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(k);
  }
  for (const k of bk) if (!ak.has(k)) onlyInB.push(k);
  return { onlyInA, onlyInB, changed };
}

/** Validate that an object has no residual sensitive keys. Throws on first violation. */
export function assertClean(meta: unknown, opts: MetadataScrubOptions = {}): void {
  if (meta === null || meta === undefined || typeof meta !== 'object') return;
  if (Array.isArray(meta)) { meta.forEach(v => assertClean(v, opts)); return; }
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (isSensitiveKey(k, opts)) throw new AnonymizeError(`Residual sensitive key: '${k}'`);
    assertClean(v, opts);
  }
}
