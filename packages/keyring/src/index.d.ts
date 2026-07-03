export interface Keyring {
  ownerId: string;
  store: object;
  derived: { key: Buffer; salt: Buffer; iterations: number; derivedAt: string };
  signingKeys: { privateKey: string; publicKey: string };
  policy: object;
  passphrase: string;
  createdAt: string;
}

export function createKeyring(ownerId: string, passphrase: string): Keyring;
export function storeSecret(keyring: Keyring, name: string, value: unknown, options?: object): object;
export function retrieveSecret(keyring: Keyring, name: string): unknown;
export function sealKeyring(keyring: Keyring): Buffer;
export function openKeyring(sealedBuffer: Buffer, passphrase: string): { vault: object; metadata: object };
export function signMessage(keyring: Keyring, payload: string | Buffer, options?: object): object;
export function verifyMessage(keyring: Keyring, signedEnvelope: object): { valid: boolean; algorithm: string; signedAt: string };
export function grantAccess(
  keyring: Keyring,
  subjectId: string,
  roleName: string,
  permissions: Array<{ resource: string; actions: string[] }>
): void;
export function checkAccess(
  keyring: Keyring,
  subjectId: string,
  resource: string,
  action: string,
  context?: object
): { allowed: boolean; reason?: string };

export const keyring: {
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
