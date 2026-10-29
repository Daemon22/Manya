/**
 * Manya Transport — Wire Protocol.
 *
 * Defines the frame envelope exchanged between Manya nodes over remote
 * transports (WebSocket relay today, other carriers later). Frames are JSON
 * text messages with a stable envelope so that loop prevention, origin
 * tracking, and relay TTLs survive every hop.
 *
 * Frame envelope:
 *   {
 *     v: 1,              // protocol version
 *     type: 'event',     // hello | welcome | event | presence | ping | pong | error | bye
 *     id: 'frm-...',     // unique frame id (per hop)
 *     ts: 1712345678901, // epoch millis
 *     origin: 'node-id', // identity id of the original sender
 *     hop: 4,            // remaining relay hops (decremented by every relay)
 *     payload: { ... }   // type-specific body
 *   }
 *
 * Loop prevention: a relay node drops a frame when hop reaches 0 or when the
 * frame's origin equals the node's own identity (it came back around).
 */

import { randomUUID, createHmac } from 'node:crypto';

export const PROTOCOL_VERSION = 1;

/** Maximum number of relay hops before a frame is dropped. */
export const MAX_HOP = 4;

export const FRAME_TYPES = Object.freeze([
  'hello',    // connect: announces identity + capabilities
  'welcome',  // server accept: announces relay identity + current presence snapshot
  'event',    // unified bus event (cross-node publish)
  'presence', // presence update (entity joined / left / updated)
  'ping',     // liveness probe
  'pong',     // liveness response
  'error',    // protocol error (payload: { code, message })
  'bye',      // graceful disconnect
]);

const RELAYABLE_TYPES = new Set(['event', 'presence']);

/**
 * Creates a validated wire frame.
 * @param {object} input
 * @param {string} input.type - One of FRAME_TYPES.
 * @param {object} [input.payload={}] - Type-specific body.
 * @param {string} input.origin - Identity id of the original sender.
 * @param {number} [input.hop=MAX_HOP] - Remaining relay hops.
 * @returns {object} Frozen frame.
 */
export function createFrame({ type, payload = {}, origin, hop = MAX_HOP }) {
  if (!type || !FRAME_TYPES.includes(type)) {
    throw new Error(`createFrame: unknown frame type "${type}"`);
  }
  if (!origin || typeof origin !== 'string') {
    throw new Error('createFrame: origin (sender identity id) is required');
  }
  return Object.freeze({
    v: PROTOCOL_VERSION,
    type,
    id: `frm-${randomUUID().slice(0, 12)}`,
    ts: Date.now(),
    origin,
    hop: Number.isFinite(hop) ? Math.max(0, Math.min(MAX_HOP, hop)) : MAX_HOP,
    payload: payload && typeof payload === 'object' ? payload : {},
  });
}

/**
 * Serializes a frame to a wire string (JSON text message).
 * @param {object} frame
 * @returns {string}
 */
export function encodeFrame(frame) {
  return JSON.stringify(frame);
}

/**
 * Parses and validates a wire frame from a text message.
 * Returns { ok: true, frame } or { ok: false, error }.
 * @param {string} raw
 * @returns {{ ok: boolean, frame?: object, error?: string }}
 */
export function decodeFrame(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: 'frame is not valid JSON' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'frame is not an object' };
  if (parsed.v !== PROTOCOL_VERSION) return { ok: false, error: `unsupported protocol version ${parsed.v}` };
  if (!parsed.type || !FRAME_TYPES.includes(parsed.type)) return { ok: false, error: `unknown frame type "${parsed.type}"` };
  if (!parsed.origin || typeof parsed.origin !== 'string') return { ok: false, error: 'frame missing origin' };
  if (typeof parsed.hop !== 'number') return { ok: false, error: 'frame missing hop counter' };
  return { ok: true, frame: parsed };
}

/**
 * Decides whether this node should relay a frame onward.
 * Loop prevention rule: relayable type, hops remaining, and not originated here.
 * @param {object} frame
 * @param {string} selfId - This node's identity id.
 * @returns {boolean}
 */
export function shouldRelay(frame, selfId) {
  if (!frame || !RELAYABLE_TYPES.has(frame.type)) return false;
  if (frame.origin === selfId) return false;
  if (typeof frame.hop !== 'number' || frame.hop <= 0) return false;
  return true;
}

/**
 * Returns a copy of the frame with one hop consumed (for relaying).
 * @param {object} frame
 * @returns {object}
 */
export function decrementHop(frame) {
  return { ...frame, hop: Math.max(0, (frame.hop || 0) - 1) };
}

/**
 * Builds a hello frame payload describing this node.
 * @param {object} identity - Node identity descriptor.
 * @param {string} identity.id
 * @param {string} [identity.kind] - intelligence | device | service | person | tool
 * @param {string} [identity.displayName]
 * @param {string[]} [identity.domains] - e.g. ['technical', 'foundation']
 * @param {string[]} [identity.capabilities]
 * @param {string} [secret] - Optional shared secret; when present a proof
 *   (HMAC-SHA256 of `${id}:${ts}`) is attached for the relay to verify.
 * @returns {object} hello frame
 */
export function createHello(identity, secret) {
  const payload = {
    identity: {
      id: identity.id,
      kind: identity.kind || 'service',
      displayName: identity.displayName || identity.id,
      domains: identity.domains || ['technical'],
      capabilities: identity.capabilities || [],
    },
  };
  if (secret) {
    payload.proof = proofFor(identity.id, secret);
  }
  return createFrame({ type: 'hello', payload, origin: identity.id });
}

/**
 * Computes the HMAC-SHA256 proof carried by hello frames.
 * @param {string} identityId
 * @param {string} secret
 * @param {number} [ts=Date.now()]
 * @returns {{ algorithm: 'hmac-sha256', ts: number, value: string }}
 */
export function proofFor(identityId, secret, ts = Date.now()) {
  const value = createHmac('sha256', secret).update(`${identityId}:${ts}`).digest('hex');
  return { algorithm: 'hmac-sha256', ts, value };
}

/**
 * Verifies a hello proof (server side).
 * @param {{ identity: { id: string }, proof: { ts: number, value: string } }} payload
 * @param {string} secret
 * @param {number} [maxSkewMs=60000]
 * @returns {boolean}
 */
export function verifyProof(payload, secret, maxSkewMs = 60000) {
  if (!payload || !payload.identity || !payload.proof) return false;
  const { id } = payload.identity;
  const { ts, value } = payload.proof;
  if (typeof ts !== 'number' || Math.abs(Date.now() - ts) > maxSkewMs) return false;
  const expected = proofFor(id, secret, ts);
  return expected.value === value;
}
