/** Hawk — Device detection and environment monitoring engine. */

import { detectDevice } from './detect.js';
import { detectCapabilities } from './capabilities.js';
import { generateFingerprint } from './fingerprint.js';

/** Subscribe to environment changes. Returns unsubscribe function. */
export function monitor(callback, env = globalThis) {
  if (typeof callback !== 'function') return () => {};
  const unsubs = [];

  if (env?.document) {
    const handler = () => callback({ type: 'visibility', detail: { hidden: env.document.hidden } });
    env.document.addEventListener('visibilitychange', handler);
    unsubs.push(() => env.document.removeEventListener('visibilitychange', handler));
  }

  if (env?.addEventListener) {
    const onOn = () => callback({ type: 'network', detail: { online: true } });
    const onOff = () => callback({ type: 'network', detail: { online: false } });
    env.addEventListener('online', onOn); env.addEventListener('offline', onOff);
    unsubs.push(() => { env.removeEventListener('online', onOn); env.removeEventListener('offline', onOff); });
  }

  const conn = env?.navigator?.connection || env?.navigator?.mozConnection || env?.navigator?.webkitConnection;
  if (conn) {
    const handler = () => callback({ type: 'connection', detail: { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt } });
    conn.addEventListener('change', handler);
    unsubs.push(() => conn.removeEventListener('change', handler));
  }

  if (env?.navigator?.getBattery) {
    env.navigator.getBattery().then(b => {
      const onCharge = () => callback({ type: 'battery', detail: { charging: b.charging, level: b.level } });
      const onLevel = () => callback({ type: 'battery', detail: { charging: b.charging, level: b.level } });
      b.addEventListener('chargingchange', onCharge); b.addEventListener('levelchange', onLevel);
      unsubs.push(() => { b.removeEventListener('chargingchange', onCharge); b.removeEventListener('levelchange', onLevel); });
    }).catch(() => {});
  }

  return () => { for (const u of unsubs) u(); };
}

export const hawk = {
  /** Detect device info from user-agent and feature checks. */
  detect: detectDevice,
  /** Generate a privacy-respecting device fingerprint. */
  fingerprint: generateFingerprint,
  /** Subscribe to environment changes. Returns unsubscribe function. */
  monitor,
  /** Complete device snapshot: detect + capabilities + fingerprint. */
  snapshot(env = globalThis) {
    return { device: detectDevice(env), capabilities: detectCapabilities(env), fingerprint: generateFingerprint(env), timestamp: Date.now() };
  },
};

export default hawk;
