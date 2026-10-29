/**
 * Manya Keyring — A sovereign identity wallet.
 *
 * Composes four existing Manya tools into one self-owned identity:
 *   - forge  derives the wallet's cryptographic key material from a passphrase
 *   - vault  stores secrets encrypted at rest, sealed under that key material
 *   - signal signs and verifies messages on the identity's behalf
 *   - shield governs who else is allowed to touch this identity's resources
 *
 * Nothing here talks to a server. A keyring is fully self-contained: whoever
 * holds the passphrase holds the identity.
 */

import { vault } from '@manya/vault';
import { forge } from '@manya/forge';
import { signal } from '@manya/signal';
import { shield } from '@manya/shield';

/**
 * Creates a new sovereign keyring for an owner.
 * @param {string} ownerId - Unique identifier for the keyring's owner.
 * @param {string} passphrase - Passphrase used to derive keys and seal the vault (min 8 chars).
 * @returns {object} A keyring instance.
 */
export function createKeyring(ownerId, passphrase) {
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
export function storeSecret(keyring, name, value, options = {}) {
  return vault.put(keyring.store, name, value, options);
}

/** Retrieves a secret from the keyring's vault. */
export function retrieveSecret(keyring, name) {
  return vault.get(keyring.store, name);
}

/** Seals the keyring's vault to an encrypted buffer, ready to persist. */
export function sealKeyring(keyring) {
  return vault.seal(keyring.store, keyring.passphrase);
}

/** Opens a previously-sealed vault buffer back into a live vault. */
export function openKeyring(sealedBuffer, passphrase) {
  return vault.open(sealedBuffer, passphrase);
}

/** Signs a payload as this keyring's owner. */
export function signMessage(keyring, payload, options = {}) {
  const envelope = signal.compose(payload, { sender: keyring.ownerId, ...options });
  return signal.sign(envelope, keyring.signingKeys.privateKey);
}

/** Verifies a message was signed by this keyring's owner. */
export function verifyMessage(keyring, signedEnvelope) {
  return signal.verifySignature(signedEnvelope, keyring.signingKeys.publicKey);
}

/**
 * Grants a subject a role with the given permissions on this keyring's policy.
 * @param {object} keyring
 * @param {string} subjectId
 * @param {string} roleName
 * @param {Array<{resource: string, actions: string[]}>} permissions
 */
export function grantAccess(keyring, subjectId, roleName, permissions) {
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
export function checkAccess(keyring, subjectId, resource, action, context = {}) {
  return shield.checkAccess(keyring.policy, subjectId, resource, action, context);
}

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
