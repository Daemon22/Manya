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
/** A sovereign keyring instance. */
export interface FacadeKeyring {
    ownerId: string;
    store: any;
    derived: any;
    signingKeys: any;
    policy: any;
    passphrase: string;
    createdAt: string;
}
/**
 * Creates a new sovereign keyring for an owner.
 * @param ownerId - Unique identifier for the keyring's owner.
 * @param passphrase - Passphrase used to derive keys and seal the vault (min 8 chars).
 */
export declare function createKeyring(ownerId: string, passphrase: string): FacadeKeyring;
/** Stores a secret in the keyring's vault. */
export declare function storeSecret(keyring: FacadeKeyring, name: string, value: unknown, options?: Record<string, unknown>): unknown;
/** Retrieves a secret from the keyring's vault. */
export declare function retrieveSecret(keyring: FacadeKeyring, name: string): unknown;
/** Seals the keyring's vault to an encrypted buffer, ready to persist. */
export declare function sealKeyring(keyring: FacadeKeyring): Buffer;
/** Opens a previously-sealed vault buffer back into a live vault. */
export declare function openKeyring(sealedBuffer: Buffer, passphrase: string): FacadeKeyring;
/** Signs a payload as this keyring's owner. */
export declare function signMessage(keyring: FacadeKeyring, payload: string | Buffer, options?: Record<string, unknown>): unknown;
/** Verifies a message was signed by the holder of the given signing keys. */
export declare function verifyMessage(keyring: Pick<FacadeKeyring, 'signingKeys'> | {
    signingKeys: {
        publicKey: string;
    };
}, signedEnvelope: unknown): import("@manya-os/signal").VerifySignatureResult;
/**
 * Grants a subject a role with the given permissions on this keyring's policy.
 */
export declare function grantAccess(keyring: FacadeKeyring, subjectId: string, roleName: string, permissions: any): void;
/** Checks whether a subject may perform an action on a resource owned by this keyring. */
export declare function checkAccess(keyring: FacadeKeyring, subjectId: string, resource: string, action: string, context?: Record<string, unknown>): import("@manya-os/shield").CheckAccessResult;
/** Unified tool-grade facade object (consumed as `keyring` by other tools). */
export declare const keyring: {
    create: typeof createKeyring;
    storeSecret: typeof storeSecret;
    retrieveSecret: typeof retrieveSecret;
    seal: typeof sealKeyring;
    open: typeof openKeyring;
    signMessage: typeof signMessage;
    verifyMessage: typeof verifyMessage;
    grantAccess: typeof grantAccess;
    checkAccess: typeof checkAccess;
};
export default keyring;
//# sourceMappingURL=facade.d.ts.map