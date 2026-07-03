# @manya/attest

Device-bound authentication. Instead of trusting a bearer token that can be
copied anywhere, bind a session to "this really is the device that
registered" — checked on every verification, not just at login.

Composes:
- **hawk** — fingerprints the device
- **signal** — signs and verifies the challenge/response
- **shield** — decides what an attested device is allowed to do

## Quick Start

```js
import { attest } from '@manya/attest'
import { signal } from '@manya/signal'

const registry = attest.createRegistry('my-app')
const keys = signal.generateSigningKeys()

// At registration time (on the device):
attest.registerDevice(registry, 'device-1')

// Later, to verify the same device is making the request:
const challenge = attest.issueChallenge(registry, 'device-1', keys)
const result = attest.verifyDevice(registry, 'device-1', challenge, keys.publicKey)
// { attested: true, signatureValid: true, fingerprintMatch: true }

// Gate access once attested:
attest.grantAndCheck(registry, 'device-1', 'account:settings', 'write', [
  { resource: 'account:settings', actions: ['write'] },
])
```

## Why fingerprint *and* sign?

A signature alone proves possession of a private key — which could be
extracted and reused elsewhere. A fingerprint alone can drift or be spoofed.
Together, they answer two different questions: "is this the right key?" and
"is this the right device?" `attest` only calls something attested when both
agree.

## License

MIT
