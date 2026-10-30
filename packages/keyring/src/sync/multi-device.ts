/**
 * @manya-os/keyring — multi-device sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import {
  SyncError,
  VerificationError,
  CredentialError,
} from '../errors.js';
import { sign, verify } from '../crypto/signatures.js';
import { constantTimeEqual } from '../crypto/hashing.js';
import type { KeyringWallet } from '../wallet/wallet.js';
import type {
  SyncBundle,
  SyncApplyResult,
  VerifiableCredential,
  SignatureAlgorithm,
} from '../types.js';

/** Sync bundle format version. */
const SYNC_BUNDLE_VERSION = 1;

/**
 * Produce a canonical byte representation of a sync bundle (with `proof`
 * stripped) for signing / verification.
 */
function canonicalBundleBytes(
  bundle: Omit<SyncBundle, 'proof'>
): Buffer {
  const stable = stableSort(bundle);
  return Buffer.from(JSON.stringify(stable), 'utf8');
}

/**
 * Recursively sort object keys.
 * @internal
 */
function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => stableSort(v));
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stableSort((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Multi-device sync coordinator.
 *
 * Produces signed sync bundles containing the source wallet's public
 * identity + credentials + timestamp + sequence number. Applies incoming
 * bundles to a target wallet, validating the signature and detecting
 * conflicts.
 *
 * Conflict policy:
 * - If a credential exists locally with a different `proofValue` for the
 *   same `id`, it's flagged as a conflict and skipped.
 * - If a credential exists locally with the same `proofValue`, it's skipped
 *   (no change).
 * - Otherwise the credential is added.
 */
export class MultiDeviceSync {
  /**
   * Create a signed sync bundle from the source wallet.
   *
   * @param wallet - Source wallet.
   * @param signerIdentityId - Optional identity to sign with. Defaults to the
   *   wallet's primary identity.
   * @returns Signed sync bundle.
   */
  public createSyncBundle(
    wallet: KeyringWallet,
    signerIdentityId?: string
  ): SyncBundle {
    const primary = signerIdentityId
      ? wallet.getIdentity(signerIdentityId)
      : wallet.getPrimaryIdentity();
    if (!primary) {
      throw new SyncError('createSyncBundle: wallet has no primary identity');
    }

    const credentials = wallet.listCredentials();
    const sequence = wallet.getSequence() + 1;
    const timestamp = new Date().toISOString();

    // The signing happens via the wallet's software-provider hook.
    // For hardware-backed wallets, callers should extend this class.
    const unsigned: Omit<SyncBundle, 'proof'> = {
      version: SYNC_BUNDLE_VERSION,
      sourceDid: primary.did,
      timestamp,
      sequence,
      identity: primary.serialize(),
      credentials,
    };
    const bytes = canonicalBundleBytes(unsigned);

    // We need the private key. The wallet exposes sign() which delegates to
    // the hardware provider. We use that path so this works for both
    // software and hardware providers.
    let signatureHex: string;
    let algorithm: SignatureAlgorithm;
    // Use the synchronous wallet.sign path when available. Since
    // wallet.sign returns a promise, we cannot call it synchronously. To
    // keep the bundle-creation API synchronous (callers usually expect
    // this), we use a synchronous software-key path via the wallet's
    // hardware provider if it is the software fallback.
    const provider = (wallet as unknown as {
      hardwareProvider: import('../hardware/provider.js').HardwareKeyProvider;
    }).hardwareProvider;
    const isSoftware =
      provider &&
      typeof (provider as unknown as {
        getPrivateKey?: (keyId: string) => crypto.KeyObject | undefined;
      }).getPrivateKey === 'function';

    const record = (wallet as unknown as {
      resolveIdentity: (id?: string) => {
        keyId: string;
        algorithm: SignatureAlgorithm;
      };
      identities: Map<string, { keyId: string; algorithm: SignatureAlgorithm }>;
      primaryIdentityId: string | null;
    });

    let resolved: { keyId: string; algorithm: SignatureAlgorithm };
    try {
      resolved = record.resolveIdentity(signerIdentityId);
    } catch (err) {
      throw new SyncError(
        'createSyncBundle: could not resolve signer identity: ' +
          (err as Error).message,
        err
      );
    }
    algorithm = resolved.algorithm;

    if (isSoftware) {
      const sk = (
        provider as unknown as {
          getPrivateKey: (keyId: string) => crypto.KeyObject | undefined;
        }
      ).getPrivateKey(resolved.keyId);
      if (!sk) {
        throw new SyncError(
          'createSyncBundle: signer private key not available'
        );
      }
      signatureHex = sign(sk, bytes, algorithm);
    } else {
      // Hardware path: callers should override createSyncBundle or pre-sign.
      throw new SyncError(
        'createSyncBundle: hardware-backed wallets must override createSyncBundle (sync signing requires a private key)'
      );
    }

    return {
      ...unsigned,
      proof: {
        type: 'manya:sync-bundle:2024',
        algorithm,
        value: signatureHex,
      },
    };
  }

  /**
   * Apply a sync bundle to a target wallet.
   *
   * @param wallet - Target wallet.
   * @param bundle - Incoming bundle.
   * @param sourcePublicKey - Public KeyObject or PEM string of the source
   *   identity. Used to verify the bundle's signature.
   * @returns Result indicating which credentials were applied, conflicted,
   *   or skipped.
   */
  public async applySyncBundle(
    wallet: KeyringWallet,
    bundle: SyncBundle,
    sourcePublicKey: crypto.KeyObject | string
  ): Promise<SyncApplyResult> {
    if (!bundle || bundle.version !== SYNC_BUNDLE_VERSION) {
      throw new SyncError(
        `applySyncBundle: unsupported bundle version ${bundle?.version}`
      );
    }
    if (!bundle.proof || !bundle.proof.value) {
      throw new SyncError('applySyncBundle: bundle missing proof');
    }
    if (!bundle.identity) {
      throw new SyncError('applySyncBundle: bundle missing identity');
    }

    // Verify signature over canonical bytes.
    const { proof, ...unsigned } = bundle;
    void proof;
    const bytes = canonicalBundleBytes(unsigned);
    let ok: boolean;
    try {
      ok = verify(
        sourcePublicKey,
        bytes,
        bundle.proof.value,
        bundle.proof.algorithm
      );
    } catch (err) {
      throw new SyncError(
        'applySyncBundle: signature verification threw: ' +
          (err as Error).message,
        err
      );
    }
    if (!ok) {
      throw new VerificationError(
        'applySyncBundle: invalid bundle signature'
      );
    }

    const applied: string[] = [];
    const conflicts: string[] = [];
    const skipped: string[] = [];

    for (const cred of bundle.credentials ?? []) {
      if (!cred || !cred.id) {
        conflicts.push('<missing-id>');
        continue;
      }
      const local = wallet.getCredential(cred.id);
      if (local) {
        if (constantTimeEqual(
          Buffer.from(local.proof.proofValue, 'hex'),
          Buffer.from(cred.proof.proofValue, 'hex')
        )) {
          skipped.push(cred.id);
        } else {
          conflicts.push(cred.id);
        }
      } else {
        try {
          await wallet.addCredential(cred);
          applied.push(cred.id);
        } catch (err) {
          throw new CredentialError(
            `applySyncBundle: failed to add credential ${cred.id}: ` +
              (err as Error).message,
            err
          );
        }
      }
    }

    // Bump sequence if the bundle's sequence is ahead of ours.
    if (bundle.sequence > wallet.getSequence()) {
      // Use the wallet's internal bumpSequence via reflection-safe path.
      for (let i = wallet.getSequence(); i < bundle.sequence; i++) {
        wallet.bumpSequence();
      }
    }

    return { applied, conflicts, skipped };
  }

  /**
   * Validate a bundle's signature without applying it. Returns `true` iff
   * the signature is valid.
   */
  public validateBundle(
    bundle: SyncBundle,
    sourcePublicKey: crypto.KeyObject | string
  ): boolean {
    if (!bundle || !bundle.proof) return false;
    const { proof, ...unsigned } = bundle;
    void proof;
    const bytes = canonicalBundleBytes(unsigned);
    try {
      return verify(
        sourcePublicKey,
        bytes,
        bundle.proof.value,
        bundle.proof.algorithm
      );
    } catch {
      return false;
    }
  }
}

/**
 * Build a sync bundle manually from raw parts. Useful for tests and for
 * constructing bundles from external state.
 *
 * @internal — exported for testing.
 */
export function buildBundleFromParts(
  parts: {
    sourceDid: string;
    timestamp: string;
    sequence: number;
    identity: import('../types.js').SerializedIdentity;
    credentials: VerifiableCredential[];
  },
  privateKey: crypto.KeyObject,
  algorithm: SignatureAlgorithm
): SyncBundle {
  const unsigned: Omit<SyncBundle, 'proof'> = {
    version: SYNC_BUNDLE_VERSION,
    sourceDid: parts.sourceDid,
    timestamp: parts.timestamp,
    sequence: parts.sequence,
    identity: parts.identity,
    credentials: parts.credentials,
  };
  const bytes = canonicalBundleBytes(unsigned);
  const signatureHex = sign(privateKey, bytes, algorithm);
  return {
    ...unsigned,
    proof: {
      type: 'manya:sync-bundle:2024',
      algorithm,
      value: signatureHex,
    },
  };
}
