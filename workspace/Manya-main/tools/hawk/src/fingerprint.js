/** Lightweight, privacy-respecting device fingerprint generation. */

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  return hash.toString(16).padStart(8, '0');
}

function combineHashes(hashes) {
  const combined = hashes.join('|');
  const h1 = djb2(combined), h2 = djb2(h1 + combined);
  return h1 + h2 + djb2(h2 + h1);
}

function tryFn(fn) { try { return fn(); } catch { return null; } }

function canvasSignature(env) {
  const canvas = tryFn(() => env?.document?.createElement('canvas'));
  if (!canvas) return 'no-canvas';
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-2d';
  ctx.textBaseline = 'top'; ctx.font = '14px Arial'; ctx.fillText('Hawk_fp', 2, 2);
  ctx.fillStyle = 'rgba(102,204,0,0.7)'; ctx.fillRect(100, 2, 80, 20);
  return djb2(canvas.toDataURL());
}

function webglSignature(env) {
  const canvas = tryFn(() => env?.document?.createElement('canvas'));
  if (!canvas) return 'no-webgl';
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'no-webgl';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
  const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
  return djb2(vendor + '|' + renderer);
}

function audioSignature(env) {
  const ctx = tryFn(() => new (env?.AudioContext || env?.webkitAudioContext)());
  if (!ctx) return 'no-audio';
  const osc = ctx.createOscillator(), analyser = ctx.createAnalyser();
  osc.connect(analyser); analyser.connect(ctx.destination);
  const sig = ctx.sampleRate + ':' + analyser.fftSize;
  ctx.close?.();
  return djb2(sig);
}

function fontSignature(env) {
  const base = ['monospace', 'sans-serif', 'serif'];
  const probe = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
  const doc = env?.document;
  if (!doc) return 'no-dom';
  const span = doc.createElement('span');
  Object.assign(span.style, { position: 'absolute', left: '-9999px', fontSize: '72px' });
  span.textContent = 'mmmmmmmmmmlli';
  const results = [];
  for (const baseFont of base) {
    span.style.fontFamily = baseFont;
    doc.body.appendChild(span);
    const baseW = span.offsetWidth;
    const detected = probe.filter(font => { span.style.fontFamily = `'${font}', ${baseFont}`; return span.offsetWidth !== baseW; });
    doc.body.removeChild(span);
    results.push(detected.join(','));
  }
  return djb2(results.join('|'));
}

function screenSignature(env) {
  const s = env?.screen;
  return s ? djb2(`${s.width}x${s.height}:${s.colorDepth}:${env.devicePixelRatio || 1}`) : 'no-screen';
}

function timezoneSignature() {
  try { return djb2(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return 'no-tz'; }
}

/** Generate a privacy-respecting device fingerprint. No personal data, cookies, or tracking IDs. */
export function generateFingerprint(env = globalThis) {
  const components = {
    canvas: canvasSignature(env), webgl: webglSignature(env), audio: audioSignature(env),
    fonts: fontSignature(env), screen: screenSignature(env), timezone: timezoneSignature(),
    platform: env?.navigator?.platform ? djb2(env.navigator.platform) : 'no-platform',
    language: env?.navigator?.language ? djb2(env.navigator.language) : 'no-language',
  };
  return { hash: combineHashes(Object.values(components)), components, timestamp: Date.now() };
}
