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
/** Keys (case-insensitive) that are stripped by default. */
export declare const SENSITIVE_METADATA_KEYS: readonly ["author", "creator", "createdBy", "lastModifiedBy", "owner", "gps", "gpslatitude", "gpslongitude", "gpsaltitude", "gpsposition", "location", "latlong", "coordinates", "geolocation", "deviceid", "deviceid", "serialnumber", "imei", "imsi", "meid", "macaddress", "ssid", "bssid", "userid", "username", "useragent", "ip", "ipaddress", "remoteaddr", "phonenumber", "email", "address", "birthdate", "dob", "exif", "xmp", "iptc", "signature", "signedby", "token", "apikey", "secret", "password", "sessionid"];
export interface MetadataScrubOptions {
    /** Additional keys to strip (merged with defaults). */
    additionalKeys?: string[];
    /** Replace with `[redacted]` instead of deleting. */
    redactInsteadOfDelete?: boolean;
    /** Keys to preserve even if they match the denylist. */
    allowlist?: string[];
}
/** Returns true if a key name should be scrubbed. */
export declare function isSensitiveKey(key: string, opts?: MetadataScrubOptions): boolean;
/**
 * Deeply scrub a metadata object. Returns a new object; the input is
 * not mutated.
 */
export declare function scrubMetadata(meta: unknown, opts?: MetadataScrubOptions): unknown;
/** Diff two metadata objects — returns keys only in `a`, only in `b`, and changed. */
export declare function diffMetadata(a: Record<string, unknown>, b: Record<string, unknown>): {
    onlyInA: string[];
    onlyInB: string[];
    changed: string[];
};
/** Validate that an object has no residual sensitive keys. Throws on first violation. */
export declare function assertClean(meta: unknown, opts?: MetadataScrubOptions): void;
//# sourceMappingURL=scrubber.d.ts.map