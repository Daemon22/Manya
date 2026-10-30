"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyring = void 0;
exports.createKeyring = createKeyring;
exports.storeSecret = storeSecret;
exports.retrieveSecret = retrieveSecret;
exports.sealKeyring = sealKeyring;
exports.openKeyring = openKeyring;
exports.signMessage = signMessage;
exports.verifyMessage = verifyMessage;
exports.grantAccess = grantAccess;
exports.checkAccess = checkAccess;
const vault_1 = require("@manya-os/vault");
const forge_1 = require("@manya-os/forge");
const signal_1 = require("@manya-os/signal");
const shield_1 = require("@manya-os/shield");
/**
 * Creates a new sovereign keyring for an owner.
 * @param ownerId - Unique identifier for the keyring's owner.
 * @param passphrase - Passphrase used to derive keys and seal the vault (min 8 chars).
 */
function createKeyring(ownerId, passphrase) {
    if (!ownerId || typeof ownerId !== 'string') {
        throw new Error('ownerId is required');
    }
    const store = vault_1.vault.create(ownerId);
    const derived = forge_1.forge.derive(passphrase);
    const signingKeys = signal_1.signal.generateSigningKeys();
    const policy = shield_1.shield.createPolicy(`${ownerId}-policy`);
    shield_1.shield.registerSubject(policy, ownerId, { roles: [] });
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
function storeSecret(keyring, name, value, options = {}) {
    return vault_1.vault.put(keyring.store, name, value, options);
}
/** Retrieves a secret from the keyring's vault. */
function retrieveSecret(keyring, name) {
    return vault_1.vault.get(keyring.store, name);
}
/** Seals the keyring's vault to an encrypted buffer, ready to persist. */
function sealKeyring(keyring) {
    return vault_1.vault.seal(keyring.store, keyring.passphrase);
}
/** Opens a previously-sealed vault buffer back into a live vault. */
function openKeyring(sealedBuffer, passphrase) {
    return vault_1.vault.open(sealedBuffer, passphrase);
}
/** Signs a payload as this keyring's owner. */
function signMessage(keyring, payload, options = {}) {
    const envelope = signal_1.signal.compose(payload, { sender: keyring.ownerId, ...options });
    return signal_1.signal.sign(envelope, keyring.signingKeys.privateKey);
}
/** Verifies a message was signed by the holder of the given signing keys. */
function verifyMessage(keyring, signedEnvelope) {
    const publicKey = keyring.signingKeys.publicKey;
    return signal_1.signal.verifySignature(signedEnvelope, publicKey);
}
/**
 * Grants a subject a role with the given permissions on this keyring's policy.
 */
function grantAccess(keyring, subjectId, roleName, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
permissions) {
    if (!keyring.policy.roles.has(roleName)) {
        shield_1.shield.defineRole(keyring.policy, roleName);
    }
    shield_1.shield.grant(keyring.policy, roleName, permissions);
    if (!keyring.policy.subjects.has(subjectId)) {
        shield_1.shield.registerSubject(keyring.policy, subjectId);
    }
    shield_1.shield.assignRole(keyring.policy, subjectId, roleName);
}
/** Checks whether a subject may perform an action on a resource owned by this keyring. */
function checkAccess(keyring, subjectId, resource, action, context = {}) {
    return shield_1.shield.checkAccess(keyring.policy, subjectId, resource, action, context);
}
/** Unified tool-grade facade object (consumed as `keyring` by other tools). */
exports.keyring = {
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
exports.default = exports.keyring;
//# sourceMappingURL=facade.js.map