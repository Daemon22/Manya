/**
 * Manya Telepathy — Signed, verifiable inter-agent messaging.
 *
 * Composes three existing Manya tools:
 *   - @manya/keyring already signs and verifies messages on an identity's
 *     behalf. Telepathy doesn't reimplement signing — it just calls it.
 *   - @manya/unify's event bus carries the signed envelopes between agents,
 *     the same way it carries every other cross-tool event.
 *   - @manya/memory records every send/receive/block as an episodic event,
 *     so "did I already tell Atlas this?" is answerable later.
 *
 * A message is only ever accepted if the sender is a known contact (their
 * public key was registered ahead of time) and the signature verifies.
 * Unknown senders are blocked and logged, never silently dropped.
 */

import { keyring as keyringApi } from '@manya/keyring';
import { memory } from '@manya/memory';
import { unify } from '@manya/unify';

/**
 * Creates a telepathy instance for one identity.
 * @param {object} ownerKeyring - A keyring created with @manya/keyring's createKeyring.
 * @param {object} memoryStore - A store created with @manya/memory's createMemoryStore.
 * @returns {object} A telepathy instance.
 */
export function createTelepathy(ownerKeyring, memoryStore) {
  if (!ownerKeyring || !ownerKeyring.ownerId) throw new Error('createTelepathy requires a keyring');
  if (!memoryStore || !memoryStore.ownerId) throw new Error('createTelepathy requires a memory store');
  return {
    keyring: ownerKeyring,
    memoryStore,
    bus: unify.createBus({ replay: true }),
    contacts: new Map(),
  };
}

/**
 * Registers a known contact's public key so their messages can be verified.
 * @param {object} telepathy - The telepathy instance.
 * @param {string} agentId - The contact's identity id.
 * @param {string} publicKey - The contact's PEM-encoded public key.
 */
export function registerContact(telepathy, agentId, publicKey) {
  if (!agentId || typeof agentId !== 'string') throw new Error('agentId is required');
  if (!publicKey || typeof publicKey !== 'string') throw new Error('publicKey is required');
  telepathy.contacts.set(agentId, publicKey);
}

/**
 * Signs and sends a payload to a target agent over the shared bus.
 * @param {object} telepathy - The telepathy instance.
 * @param {string} targetAgentId - The recipient's identity id.
 * @param {object} payload - The payload to send (will be JSON-stringified).
 * @returns {object} The signed envelope that was published.
 */
export function send(telepathy, targetAgentId, payload) {
  if (!targetAgentId || typeof targetAgentId !== 'string') throw new Error('targetAgentId is required');
  const envelope = keyringApi.signMessage(telepathy.keyring, JSON.stringify(payload), {
    recipients: [targetAgentId],
  });
  unify.publish(telepathy.bus, `telepathy:${targetAgentId}`, {
    type: 'telepathy',
    sourceToolId: telepathy.keyring.ownerId,
    payload: envelope,
  });
  memory.remember(telepathy.memoryStore, telepathy.keyring.ownerId, `Telepathic message sent to ${targetAgentId}`);
  return envelope;
}

/**
 * Subscribes to this identity's inbound channel. Verified messages are
 * passed to the handler as { from, payload }; unverified or unknown-sender
 * messages are blocked and only recorded, never handed to the caller.
 * @param {object} telepathy - The telepathy instance.
 * @param {function} handler - Invoked with { from, payload } for verified messages.
 * @returns {function} Unsubscribe function.
 */
export function listen(telepathy, handler) {
  return unify.subscribe(telepathy.bus, `telepathy:${telepathy.keyring.ownerId}`, (evt) => {
    const envelope = evt.payload;
    const senderPublicKey = telepathy.contacts.get(envelope.sender);
    if (!senderPublicKey) {
      memory.remember(telepathy.memoryStore, 'Telepathy', `Blocked message from unknown sender ${envelope.sender}`);
      return;
    }
    const result = keyringApi.verifyMessage({ signingKeys: { publicKey: senderPublicKey } }, envelope);
    if (!result.valid) {
      memory.remember(telepathy.memoryStore, 'Telepathy', `Blocked unverified message from ${envelope.sender}`);
      return;
    }
    memory.remember(telepathy.memoryStore, envelope.sender, 'Telepathic message received and verified');
    handler({ from: envelope.sender, payload: JSON.parse(envelope.payload) });
  }, { subscriberId: telepathy.keyring.ownerId });
}

export const telepathy = {
  createTelepathy,
  registerContact,
  send,
  listen,
};

export default telepathy;
