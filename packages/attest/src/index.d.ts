export interface DeviceRecord {
  deviceId: string;
  fingerprint: { hash: string; components: object; timestamp: number };
  device: object;
  registeredAt: string;
}

export interface Registry {
  name: string;
  devices: Map<string, DeviceRecord>;
  policy: object;
}

export function createRegistry(name?: string): Registry;
export function registerDevice(registry: Registry, deviceId: string, env?: object): DeviceRecord;
export function issueChallenge(registry: Registry, deviceId: string, signingKeys: { privateKey: string; publicKey: string }): object;
export function verifyDevice(
  registry: Registry,
  deviceId: string,
  signedChallenge: object,
  publicKey: string,
  env?: object
): { attested: boolean; reason?: string; fingerprintMatch?: boolean; signatureValid?: boolean };
export function grantAndCheck(
  registry: Registry,
  deviceId: string,
  resource: string,
  action: string,
  permissions: Array<{ resource: string; actions: string[] }>
): { allowed: boolean; reason?: string };

export const attest: {
  createRegistry: typeof createRegistry;
  registerDevice: typeof registerDevice;
  issueChallenge: typeof issueChallenge;
  verifyDevice: typeof verifyDevice;
  grantAndCheck: typeof grantAndCheck;
};

export default attest;
