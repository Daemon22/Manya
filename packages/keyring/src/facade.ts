/**
 * @manya-os/keyring — tool-grade facade.
 *
 * A sovereign identity wallet composed from the platform tools: forge
 * (key derivation), vault (encrypted secret storage), signal (message
 * signing), and shield (access policy). Nothing here talks to a server —
 * whoever holds the passphrase holds the identity.
 *
 * This facade is the composition surface used by @manya-os/telepathy and
 * the agent toolchain. The platform-grade KeyringWallet in this package
 * remains the production implementation; the two serve different layers.
 *
 * Ported from the Manya reference implementation (packages/keyring).
 */

import { vault } from '@manya-os/vault';
import { forge } from '@manya-os/forge';
import { signal } from '@manya-os/signal';
import { shield } from '@manya-os/shield';

/** A sovereign keyring instance. */
export interface FacadeKeyring {
  ownerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  derived: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signingKeys: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  policy: any;
  passphrase: string;
  createdAt: string;
}

/**
 * Creates a new sovereign keyring for an owner.
 * @param ownerId - Unique identifier for the keyring's owner.
 * @param passphrase - Passphrase used to derive keys and seal the vault (min 8 chars).
 */
export function createKeyring(ownerId: string, passphrase: string): FacadeKeyring {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('ownerId is required');
  }
  const store = vault.create(ownerId);
  const derived = forge.derive(passphrase);
  const signingKeys = signal.generateSigningKeys();
  const policy = shield.createPolicy(`${ownerId}-policy`);
  shield.registerSubject(policy, ownerId, { roles: [] });

  return {
    ownerId,
    store,
    derived,
    signingKeys,
    policy,
    passphrase,
    createdAt: new Date().toISOString(),
  };
}

/** Stores a secret in the keyring's vault. */
export function storeSecret(
  keyring: FacadeKeyring,
  name: string,
  value: unknown,
  options: Record<string, unknown> = {}
): unknown {
  return vault.put(keyring.store, name, value as never, options);
}

/** Retrieves a secret from the keyring's vault. */
export function retrieveSecret(keyring: FacadeKeyring, name: string): unknown {
  return vault.get(keyring.store, name);
}

/** Seals the keyring's vault to an encrypted buffer, ready to persist. */
export function sealKeyring(keyring: FacadeKeyring): Buffer {
  return vault.seal(keyring.store, keyring.passphrase);
}

/** Opens a previously-sealed vault buffer back into a live vault. */
export function openKeyring(sealedBuffer: Buffer, passphrase: string): FacadeKeyring {
  return vault.open(sealedBuffer, passphrase) as unknown as FacadeKeyring;
}

/** Signs a payload as this keyring's owner. */
export function signMessage(
  keyring: FacadeKeyring,
  payload: string | Buffer,
  options: Record<string, unknown> = {}
): unknown {
  const envelope = signal.compose(payload, { sender: keyring.ownerId, ...options });
  return signal.sign(envelope, keyring.signingKeys.privateKey);
}

/** Verifies a message was signed by the holder of the given signing keys. */
export function verifyMessage(
  keyring: Pick<FacadeKeyring, 'signingKeys'> | { signingKeys: { publicKey: string } },
  signedEnvelope: unknown
) {
  const publicKey = (keyring as { signingKeys: { publicKey: string } }).signingKeys.publicKey;
  return signal.verifySignature(signedEnvelope as never, publicKey);
}

/**
 * Grants a subject a role with the given permissions on this keyring's policy.
 */
export function grantAccess(
  keyring: FacadeKeyring,
  subjectId: string,
  roleName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissions: any
): void {
  if (!keyring.policy.roles.has(roleName)) {
    shield.defineRole(keyring.policy, roleName);
  }
  shield.grant(keyring.policy, roleName, permissions);
  if (!keyring.policy.subjects.has(subjectId)) {
    shield.registerSubject(keyring.policy, subjectId);
  }
  shield.assignRole(keyring.policy, subjectId, roleName);
}

/** Checks whether a subject may perform an action on a resource owned by this keyring. */
export function checkAccess(
  keyring: FacadeKeyring,
  subjectId: string,
  resource: string,
  action: string,
  context: Record<string, unknown> = {}
) {
  return shield.checkAccess(keyring.policy, subjectId, resource, action, context);
}

/** Unified tool-grade facade object (consumed as `keyring` by other tools). */
export const keyring = {
  create: createKeyring,
  storeSecret,
  retrieveSecret,
  seal: sealKeyring,
  open: openKeyring,
  signMessage,
  verifyMessage,
  grantAccess,
  checkAccess,
};

export default keyring;
