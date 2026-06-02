/** Environment capability detection. */

function tryFn(fn) { try { return fn(); } catch { return null; } }

function getScreen(env) {
  const s = env?.screen;
  if (!s) return { supported: false };
  return { supported: true, width: s.width, height: s.height, availWidth: s.availWidth,
    availHeight: s.availHeight, colorDepth: s.colorDepth, pixelDepth: s.pixelDepth,
    devicePixelRatio: env.devicePixelRatio || 1 };
}

function getTouch(env) {
  return { supported: !!(env?.navigator?.maxTouchPoints > 0 || 'ontouchstart' in (env || {})),
    maxTouchPoints: env?.navigator?.maxTouchPoints || 0 };
}

function getWebGL(env) {
  const canvas = tryFn(() => env?.document?.createElement('canvas'));
  if (!canvas) return { supported: false };
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return { supported: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return { supported: true, version: gl.getParameter(gl.VERSION),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
}

function getAudio(env) {
  const ctx = tryFn(() => new (env?.AudioContext || env?.webkitAudioContext)());
  if (!ctx) return { supported: false };
  ctx.close?.();
  return { supported: true, sampleRate: ctx.sampleRate, maxChannelCount: ctx.destination?.maxChannelCount || null };
}

function getStorage(env) {
  return { localStorage: tryFn(() => !!env?.localStorage), sessionStorage: tryFn(() => !!env?.sessionStorage),
    indexedDB: !!env?.indexedDB };
}

function getNetwork(env) {
  const conn = env?.navigator?.connection || env?.navigator?.mozConnection || env?.navigator?.webkitConnection;
  if (!conn) return { supported: false };
  return { supported: true, type: conn.type || 'unknown', effectiveType: conn.effectiveType || 'unknown',
    downlink: conn.downlink ?? null, rtt: conn.rtt ?? null, saveData: conn.saveData ?? false };
}

function getPerformance(env) {
  return { memory: env?.navigator?.deviceMemory ?? null, cpuCores: env?.navigator?.hardwareConcurrency ?? null,
    timing: !!env?.performance?.timing };
}

/** Detect all environment capabilities. */
export function detectCapabilities(env = globalThis) {
  return {
    screen: getScreen(env), touch: getTouch(env), webgl: getWebGL(env), audio: getAudio(env),
    sw: { supported: !!env?.navigator?.serviceWorker }, storage: getStorage(env),
    network: getNetwork(env), performance: getPerformance(env), battery: { supported: !!env?.navigator?.getBattery },
  };
}
