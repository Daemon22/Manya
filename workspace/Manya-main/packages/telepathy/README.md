# @manya/telepathy

Signed, verifiable inter-agent messaging.

Composed from `@manya/keyring` (identity + signing, already built),
`@manya/unify` (the event bus that carries the envelope), and
`@manya/memory` (records every send/receive/block episodically).

A message is accepted only if the sender is a registered contact and the
signature verifies. Unknown senders and forged signatures are blocked and
logged — never silently dropped, never silently accepted.

## Usage

```js
import { keyring } from '@manya/keyring';
import { memory } from '@manya/memory';
import { telepathy } from '@manya/telepathy';

const araKeyring = keyring.create('ara', 'a-strong-passphrase');
const araMemory = memory.createMemoryStore('ara');
const araTelepathy = telepathy.createTelepathy(araKeyring, araMemory);

// Somewhere, atlas's public key becomes known to ara (e.g. via attest).
telepathy.registerContact(araTelepathy, 'atlas', atlasPublicKey);

telepathy.listen(araTelepathy, ({ from, payload }) => {
  console.log(`${from} says:`, payload);
});

telepathy.send(araTelepathy, 'atlas', { note: 'device provisioned' });
```

## Why this composition

Telepathy doesn't invent a second cryptographic identity system — it calls
`keyring.signMessage`/`verifyMessage`, which already exist and are already
tested. The only new thing telepathy adds is a contact directory and the
routing of signed envelopes over `unify`'s bus.
