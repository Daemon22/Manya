import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hawk, monitor } from '../src/index.js';
import { parseUserAgent, detectDevice } from '../src/detect.js';
import { detectCapabilities } from '../src/capabilities.js';
import { generateFingerprint } from '../src/fingerprint.js';

// Mock browser environment for Node.js
const mockEnv = {
  navigator: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true,
    cookieEnabled: true,
    maxTouchPoints: 0,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    platform: 'MacIntel',
    serviceWorker: {},
    getBattery: undefined,
  },
  screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1050, colorDepth: 24, pixelDepth: 24 },
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    createElement: () => ({ getContext: () => null, toDataURL: () => '', style: {}, textContent: '', offsetWidth: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    hidden: false,
    body: { appendChild: () => {}, removeChild: () => {} },
  },
  localStorage: {},
  sessionStorage: {},
  indexedDB: {},
};

describe('parseUserAgent', () => {
  it('detects Chrome on macOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const info = parseUserAgent(ua);
    assert.equal(info.type, 'desktop');
    assert.equal(info.browser, 'Chrome');
    assert.equal(info.os, 'macOS');
    assert.equal(info.isBot, false);
  });

  it('detects mobile device', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const info = parseUserAgent(ua);
    assert.equal(info.type, 'mobile');
    assert.equal(info.os, 'iOS');
    assert.equal(info.brand, 'Apple');
  });

  it('detects bot', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    const info = parseUserAgent(ua);
    assert.equal(info.type, 'bot');
    assert.equal(info.isBot, true);
  });

  it('detects tablet', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    const info = parseUserAgent(ua);
    assert.equal(info.type, 'tablet');
  });
});

describe('detectDevice', () => {
  it('returns expected structure', () => {
    const info = detectDevice(mockEnv);
    assert.ok(['mobile', 'tablet', 'desktop', 'bot'].includes(info.type));
    assert.equal(typeof info.brand, 'string');
    assert.equal(typeof info.model, 'string');
    assert.equal(typeof info.os, 'string');
    assert.equal(typeof info.browser, 'string');
    assert.equal(typeof info.engine, 'string');
    assert.equal(typeof info.isBot, 'boolean');
  });

  it('includes browser-extras when navigator available', () => {
    const info = detectDevice(mockEnv);
    assert.equal(info.language, 'en-US');
    assert.deepEqual(info.languages, ['en-US', 'en']);
    assert.equal(info.onLine, true);
    assert.equal(info.cookieEnabled, true);
  });
});

describe('detectCapabilities', () => {
  it('returns expected top-level keys', () => {
    const caps = detectCapabilities(mockEnv);
    assert.ok('screen' in caps);
    assert.ok('touch' in caps);
    assert.ok('webgl' in caps);
    assert.ok('audio' in caps);
    assert.ok('sw' in caps);
    assert.ok('storage' in caps);
    assert.ok('network' in caps);
    assert.ok('performance' in caps);
    assert.ok('battery' in caps);
  });

  it('returns booleans for capability flags', () => {
    const caps = detectCapabilities(mockEnv);
    assert.equal(typeof caps.touch.supported, 'boolean');
    assert.equal(typeof caps.sw.supported, 'boolean');
    assert.equal(typeof caps.battery.supported, 'boolean');
  });

  it('screen has expected fields', () => {
    const caps = detectCapabilities(mockEnv);
    assert.equal(caps.screen.supported, true);
    assert.equal(caps.screen.width, 1920);
    assert.equal(caps.screen.height, 1080);
  });
});

describe('generateFingerprint', () => {
  it('returns a hash string', () => {
    const fp = generateFingerprint(mockEnv);
    assert.equal(typeof fp.hash, 'string');
    assert.ok(fp.hash.length > 0);
  });

  it('returns components', () => {
    const fp = generateFingerprint(mockEnv);
    assert.ok('components' in fp);
    assert.ok('canvas' in fp.components);
    assert.ok('webgl' in fp.components);
    assert.ok('timezone' in fp.components);
  });

  it('returns timestamp', () => {
    const fp = generateFingerprint(mockEnv);
    assert.equal(typeof fp.timestamp, 'number');
    assert.ok(fp.timestamp > 0);
  });

  it('hash is deterministic for same env', () => {
    const fp1 = generateFingerprint(mockEnv);
    const fp2 = generateFingerprint(mockEnv);
    assert.equal(fp1.hash, fp2.hash);
  });
});

describe('hawk.detect', () => {
  it('delegates to detectDevice', () => {
    const info = hawk.detect(mockEnv);
    assert.equal(info.browser, 'Chrome');
    assert.equal(info.os, 'macOS');
  });
});

describe('hawk.fingerprint', () => {
  it('delegates to generateFingerprint', () => {
    const fp = hawk.fingerprint(mockEnv);
    assert.ok(fp.hash.length > 0);
  });
});

describe('hawk.snapshot', () => {
  it('combines device, capabilities, and fingerprint', () => {
    const snap = hawk.snapshot(mockEnv);
    assert.ok('device' in snap);
    assert.ok('capabilities' in snap);
    assert.ok('fingerprint' in snap);
    assert.ok('timestamp' in snap);
    assert.equal(snap.device.type, 'desktop');
    assert.equal(typeof snap.fingerprint.hash, 'string');
  });
});

describe('monitor', () => {
  it('returns unsubscribe function', () => {
    const unsub = monitor(() => {}, mockEnv);
    assert.equal(typeof unsub, 'function');
    unsub();
  });

  it('handles non-function callback', () => {
    const unsub = monitor(null, mockEnv);
    assert.equal(typeof unsub, 'function');
  });
});
