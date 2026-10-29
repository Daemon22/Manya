/**
 * Manya Attest — Device-bound authentication.
 *
 * Composes three existing Manya tools:
 *   - hawk   fingerprints the device making a request
 *   - signal signs a challenge/response envelope for that fingerprint
 *   - shield decides whether the resulting attested identity may proceed
 *
 * The idea: instead of trusting a bearer token that can be copied anywhere,
 * bind the session to "this really is the device that registered", checked
 * on every verification.
 */

import { hawk } from '@manya/hawk';
import { signal } from '@manya/signal';
import { shield } from '@manya/shield';

/**
 * Creates a new attestation registry. Holds registered devices and the
 * access policy governing what an attested device may do.
 */
export function createRegistry(name = 'attest-registry') {
  return {
    name,
    devices: new Map(),
    policy: shield.createPolicy(`${name}-policy`),
  };
}

/**
 * Registers a device, binding a deviceId to its current fingerprint.
 * @param {object} registry
 * @param {string} deviceId
 * @param {object} [env] - Environment to fingerprint (defaults to globalThis).
 */
export function registerDevice(registry, deviceId, env = globalThis) {
  const snapshot = hawk.snapshot(env);
  registry.devices.set(deviceId, { deviceId, fingerprint: snapshot.fingerprint, device: snapshot.device, registeredAt: new Date().toISOString() });
  if (!registry.policy.subjects.has(deviceId)) {
    shield.registerSubject(registry.policy, deviceId);
  }
  return registry.devices.get(deviceId);
}

/**
 * Issues a signed challenge envelope for a registered device to respond to.
 * @param {object} registry
 * @param {string} deviceId
 * @param {object} signingKeys - { privateKey, publicKey } from signal.generateSigningKeys().
 */
export function issueChallenge(registry, deviceId, signingKeys) {
  if (!registry.devices.has(deviceId)) {
    throw new Error(`Device "${deviceId}" is not registered`);
  }
  const envelope = signal.compose(`challenge:${deviceId}:${Date.now()}`, { sender: registry.name, recipients: [deviceId] });
  return signal.sign(envelope, signingKeys.privateKey);
}

/**
 * Verifies a device is still the device it claims to be: checks the
 * challenge signature, then re-fingerprints the current environment and
 * compares it against the fingerprint captured at registration.
 * @returns {{ attested: boolean, reason?: string, fingerprintMatch?: boolean, signatureValid?: boolean }}
 */
export function verifyDevice(registry, deviceId, signedChallenge, publicKey, env = globalThis) {
  const record = registry.devices.get(deviceId);
  if (!record) {
    return { attested: false, reason: 'Device not registered' };
  }
  const sig = signal.verifySignature(signedChallenge, publicKey);
  if (!sig.valid) {
    return { attested: false, reason: 'Invalid challenge signature', signatureValid: false };
  }
  const currentFingerprint = hawk.fingerprint(env);
  const fingerprintMatch = currentFingerprint.hash === record.fingerprint.hash;
  return {
    attested: fingerprintMatch,
    reason: fingerprintMatch ? undefined : 'Fingerprint mismatch',
    signatureValid: true,
    fingerprintMatch,
  };
}

/**
 * Grants an attested device permission to act on a resource, then checks it.
 */
export function grantAndCheck(registry, deviceId, resource, action, permissions) {
  const roleName = `${deviceId}-role`;
  if (!registry.policy.roles.has(roleName)) {
    shield.defineRole(registry.policy, roleName);
    shield.grant(registry.policy, roleName, permissions);
    shield.assignRole(registry.policy, deviceId, roleName);
  }
  return shield.checkAccess(registry.policy, deviceId, resource, action);
}

export const attest = {
  createRegistry,
  registerDevice,
  issueChallenge,
  verifyDevice,
  grantAndCheck,
};

export default attest;
