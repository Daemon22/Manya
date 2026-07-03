# @manya/hawk

Device detection and environment monitoring engine for the Manya ecosystem. Detects device type, browser capabilities, and generates privacy-respecting fingerprints — all client-side, zero dependencies.

## Quick Start

```js
import { hawk } from '@manya/hawk'

const device = hawk.detect()
const fp = hawk.fingerprint()
const snap = hawk.snapshot()
```

## API

### `hawk.detect(env?)`

Returns device info from user-agent parsing and feature checks.

```js
{
  type: 'desktop',           // 'mobile' | 'tablet' | 'desktop' | 'bot'
  brand: 'Apple',
  model: 'Macintosh',
  os: 'macOS',
  osVersion: '14.0',
  browser: 'Chrome',
  browserVersion: '120.0',
  engine: 'Blink',
  isBot: false,
  language: 'en-US',
  languages: ['en-US', 'en'],
  onLine: true,
  cookieEnabled: true
}
```

### `hawk.fingerprint(env?)`

Generates a privacy-respecting device fingerprint. No personal data, cookies, or tracking IDs.

```js
{
  hash: 'a1b2c3d4e5f6...',   // 24-char hex hash
  components: {               // individual signal hashes
    canvas: '4a3b2c1d',
    webgl: '7f8e9d0a',
    audio: '1b2c3d4e',
    fonts: '5e6f7a8b',
    screen: '9c0d1e2f',
    timezone: '3a4b5c6d',
    platform: '7e8f9a0b',
    language: '1c2d3e4f'
  },
  timestamp: 1700000000000
}
```

### `hawk.monitor(callback, env?)`

Subscribes to environment changes. Returns an unsubscribe function.

```js
const unsub = hawk.monitor(({ type, detail }) => {
  console.log(type, detail)
  // type: 'visibility' | 'network' | 'connection' | 'battery'
})

unsub() // stop monitoring
```

Events:
- `visibility` — `{ hidden: boolean }`
- `network` — `{ online: boolean }`
- `connection` — `{ effectiveType, downlink, rtt }`
- `battery` — `{ charging, level }`

### `hawk.snapshot(env?)`

Returns everything in one call: device + capabilities + fingerprint.

```js
{
  device: { ... },           // same as hawk.detect()
  capabilities: {            // environment capability checks
    screen: { supported: true, width: 1920, height: 1080, ... },
    touch: { supported: false, maxTouchPoints: 0 },
    webgl: { supported: true, version: 'WebGL 1.0', vendor: '...', renderer: '...' },
    audio: { supported: true, sampleRate: 48000, maxChannelCount: 2 },
    sw: { supported: true },
    storage: { localStorage: true, sessionStorage: true, indexedDB: true },
    network: { supported: true, effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
    performance: { memory: 8, cpuCores: 8, timing: true },
    battery: { supported: true }
  },
  fingerprint: { ... },     // same as hawk.fingerprint()
  timestamp: 1700000000000
}
```

## Notes

- All functions accept an optional `env` parameter (defaults to `globalThis`) for testing or SSR.
- In Node.js, functions return partial results where browser APIs are unavailable.
- Zero external dependencies.
