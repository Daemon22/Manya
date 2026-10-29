# @manya/keyring

A sovereign identity wallet. Composes four existing Manya tools into one
self-owned identity — nothing here talks to a server, and nothing about it
requires the rest of the Manya ecosystem to run:

- **forge** derives the wallet's cryptographic key material from a passphrase
- **vault** stores secrets encrypted at rest, sealed under that key material
- **signal** signs and verifies messages on the identity's behalf
- **shield** governs who else is allowed to touch this identity's resources

Whoever holds the passphrase holds the identity.

## Quick Start

```js
import { keyring } from '@manya/keyring'

const kr = keyring.create('uviwe', 'a very strong passphrase')

keyring.storeSecret(kr, 'github-token', 'ghp_...')
const token = keyring.retrieveSecret(kr, 'github-token')

const signed = keyring.signMessage(kr, 'I approve this release')
keyring.verifyMessage(kr, signed) // { valid: true, ... }

// Persist the wallet to disk, encrypted
const sealed = keyring.seal(kr)
// ...later, on any machine:
const { vault } = keyring.open(sealed, 'a very strong passphrase')
```

## Access control

A keyring can grant scoped access to its resources to other identities:

```js
keyring.grantAccess(kr, 'ci-bot', 'deployer', [
  { resource: 'secrets:github-token', actions: ['read'] },
])

keyring.checkAccess(kr, 'ci-bot', 'secrets:github-token', 'read')
// { allowed: true, matchedRules: [...] }
```

## API

- `keyring.create(ownerId, passphrase)`
- `keyring.storeSecret(kr, name, value, options?)`
- `keyring.retrieveSecret(kr, name)`
- `keyring.seal(kr)` / `keyring.open(sealedBuffer, passphrase)`
- `keyring.signMessage(kr, payload, options?)`
- `keyring.verifyMessage(kr, signedEnvelope)`
- `keyring.grantAccess(kr, subjectId, roleName, permissions)`
- `keyring.checkAccess(kr, subjectId, resource, action, context?)`

## License

MIT
