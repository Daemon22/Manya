/**
 * Manya-OS Bridge — wire protocol + fabric bridge + minimal relay.
 *
 * Connects a Manya-OS process to Manya's remote nervous system:
 *
 *   Manya-OS EventFabric  --(outbound 'published' events)-->  wire frames
 *   Manya relay/bus       --(inbound 'event' frames)-------->  EventFabric
 *
 * The frame envelope mirrors @manya/transport's protocol (v1): JSON text
 * messages with { v, type, id, ts, origin, hop, payload }. Mirroring (rather
 * than importing) follows the two repos' established convention of mirrored
 * packages (see NOTICE in the Manya repository) — it keeps this package at
 * zero runtime dependencies and independently buildable, per the OS
 * local-first principle.
 *
 * Loop prevention matches Manya's semantics: frames are relayed with a hop
 * budget and dropped when they return to their origin.
 */

import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

export const PROTOCOL_VERSION = 1;
export const MAX_HOP = 4;
export const FRAME_TYPES = Object.freeze([
  'hello', 'welcome', 'event', 'presence', 'ping', 'pong', 'error', 'bye',
]);
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
}

// ---------------------------------------------------------------------------
// Frame envelope (mirror of @manya/transport protocol.js)
// ---------------------------------------------------------------------------

export function createFrame({ type, payload = {}, origin, hop = MAX_HOP }) {
  if (!type || !FRAME_TYPES.includes(type)) throw new Error(`unknown frame type "${type}"`);
  if (!origin || typeof origin !== 'string') throw new Error('frame origin is required');
  return Object.freeze({
    v: PROTOCOL_VERSION,
    type,
    id: `frm-${crypto.randomUUID().slice(0, 12)}`,
    ts: Date.now(),
    origin,
    hop: Number.isFinite(hop) ? Math.max(0, Math.min(MAX_HOP, hop)) : MAX_HOP,
    payload: payload && typeof payload === 'object' ? payload : {},
  });
}

export function encodeFrame(frame) {
  return JSON.stringify(frame);
}

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

export function shouldRelay(frame, selfId) {
  if (!frame || (frame.type !== 'event' && frame.type !== 'presence')) return false;
  if (frame.origin === selfId) return false;
  return typeof frame.hop === 'number' && frame.hop > 0;
}

export function proofFor(identityId, secret, ts = Date.now()) {
  return {
    algorithm: 'hmac-sha256',
    ts,
    value: crypto.createHmac('sha256', secret).update(`${identityId}:${ts}`).digest('hex'),
  };
}

export function verifyProof(payload, secret, maxSkewMs = 60000) {
  if (!payload || !payload.identity || !payload.proof) return false;
  const { ts } = payload.proof;
  if (typeof ts !== 'number' || Math.abs(Date.now() - ts) > maxSkewMs) return false;
  return proofFor(payload.identity.id, secret, ts).value === payload.proof.value;
}

// ---------------------------------------------------------------------------
// Connection authorization contract (mirror of Manya's Connect truth)
//
// Reach is free; connect is consented. An intelligence that has *reached*
// another side asks once ('connection.request') and waits. The owner of the
// reached side answers with what they hold — a passkey ceremony, a QR scan,
// or a 7-character pairing code ('connection.grant') — or withdraws a prior
// consent ('connection.revoke'). The methods, the code alphabet, and the
// 7-character code shape mirror Manya's Connect surface verbatim so a grant
// minted on either side of the bridge is honored on the other.
// ---------------------------------------------------------------------------

/** Approval methods the Manya UI can answer a connection request with. */
export const CONNECTION_METHODS = Object.freeze(['INQUIRY', 'QR', 'CODE', 'PASSKEY']);

/**
 * Wire topics that carry the connection authorization model.
 * Every topic is also published into the fabric as a normal event;
 * valid ones are additionally routed to the collaboration queue.
 */
export const CONNECTION_TOPICS = Object.freeze([
  'connection.request', 'connection.grant', 'connection.revoke',
]);

/**
 * Pairing-code alphabet, mirrored from Manya's Connect surface: no ambiguous
 * glyphs (0/O, 1/I/L, 5/S, 8/B, 2/Z kept out), so codes read aloud survive.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ34679';

/**
 * Mints a pairing code with the same shape as Manya's server-side
 * `generateCode` (default 7 characters, crypto random, unambiguous alphabet).
 */
export function mintPairingCode(len = 7) {
  const bytes = crypto.randomBytes(Math.max(1, len | 0));
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** True when `code` is exactly `len` characters of the pairing alphabet. */
export function isValidPairingCode(code, len = 7) {
  if (typeof code !== 'string' || code.length !== len) return false;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return false;
  return true;
}

function connectionEvent(topic, source, payload) {
  return Object.freeze({
    id: `evt-${crypto.randomUUID().slice(0, 12)}`,
    topic,
    source,
    payload: Object.freeze({ ...payload }),
    timestamp: Date.now(),
    severity: 'info',
    tags: Object.freeze(['connection']),
    metadata: Object.freeze({ via: 'fabric', contract: 'connection/1' }),
  });
}

function assertMethod(method) {
  if (!CONNECTION_METHODS.includes(method)) {
    throw new Error(`connection method must be one of ${CONNECTION_METHODS.join(' | ')} (got "${method}")`);
  }
}

/**
 * Builds the fabric event an instance publishes when it asks to connect.
 * Validation-light by design: asking is reach, and reach is free — the
 * reached side decides what a request is worth.
 */
export function createConnectionRequest({ requestId, from, to, method, note } = {}) {
  if (!requestId) throw new Error('createConnectionRequest requires requestId');
  if (!from) throw new Error('createConnectionRequest requires from');
  if (!to) throw new Error('createConnectionRequest requires to');
  if (method !== undefined) assertMethod(method);
  return connectionEvent('connection.request', from, {
    requestId, target: to, method: method || 'INQUIRY', note: note || '',
  });
}

/**
 * Builds the fabric event an owner publishes to approve a connection.
 * Strict by design: consent is the one thing the bridge never relaxes.
 * A CODE grant must carry a valid 7-character pairing code.
 */
export function createConnectionGrant({ requestId, method, approvedBy, code, note } = {}) {
  if (!requestId) throw new Error('createConnectionGrant requires requestId');
  assertMethod(method);
  if (method === 'CODE' && !isValidPairingCode(code)) {
    throw new Error('a CODE grant requires a valid 7-character pairing code');
  }
  const payload = { requestId, method, approvedBy: approvedBy || 'owner' };
  if (code !== undefined) payload.code = String(code).toUpperCase();
  if (note) payload.note = note;
  return connectionEvent('connection.grant', approvedBy || 'owner', payload);
}

/** Builds the fabric event an owner publishes to withdraw a consent. */
export function createConnectionRevoke({ requestId, revokedBy, reason } = {}) {
  if (!requestId) throw new Error('createConnectionRevoke requires requestId');
  return connectionEvent('connection.revoke', revokedBy || 'owner', {
    requestId, reason: reason || '',
  });
}

// ---------------------------------------------------------------------------
// Minimal RFC 6455 client (text frames, ping/pong, close)
// ---------------------------------------------------------------------------

const OP_TEXT = 0x1;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

function encodeWSFrame(opcode, payload, mask) {
  const len = payload.length;
  const maskBytes = mask ? 4 : 0;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2 + maskBytes);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4 + maskBytes);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10 + maskBytes);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 0x80 | opcode;
  if (mask) {
    header[1] |= 0x80;
    const key = crypto.randomBytes(4);
    key.copy(header, header.length - 4);
    const masked = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ key[i & 3];
    return Buffer.concat([header, masked]);
  }
  return Buffer.concat([header, payload]);
}

class BridgeSocket extends EventEmitter {
  constructor(socket, { maskOutgoing = true } = {}) {
    super();
    this.socket = socket;
    this._maskOutgoing = maskOutgoing;
    this._buffer = Buffer.alloc(0);
    this._closed = false;
    socket.on('data', (chunk) => {
      this._buffer = Buffer.concat([this._buffer, chunk]);
      try {
        this._drain();
      } catch (err) {
        this.emit('error', err);
        this.close(1002);
      }
    });
    socket.on('error', (err) => this.emit('error', err));
    socket.on('close', () => {
      if (!this._closed) {
        this._closed = true;
        this.emit('close', 1006);
      }
    });
  }

  _drain() {
    for (;;) {
      const buf = this._buffer;
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buf.length < offset + 2) return;
        len = buf.readUInt16BE(offset);
        offset += 2;
      } else if (len === 127) {
        if (buf.length < offset + 8) return;
        len = Number(buf.readBigUInt64BE(offset));
        offset += 8;
      }
      if (len > 8 * 1024 * 1024) throw new Error('WS frame too large');
      let maskKey = null;
      if (masked) {
        if (buf.length < offset + 4) return;
        maskKey = buf.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buf.length < offset + len) return;
      let payload = Buffer.from(buf.subarray(offset, offset + len));
      this._buffer = buf.subarray(offset + len);
      if (maskKey) for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i & 3];
      this._handle({ fin, opcode, payload });
      if (this._closed) return;
    }
  }

  _handle({ fin, opcode, payload }) {
    switch (opcode) {
      case OP_TEXT:
        this.emit('message', payload.toString('utf8'));
        break;
      case OP_PING:
        this._raw(OP_PONG, payload);
        break;
      case OP_PONG:
        this.emit('pong');
        break;
      case OP_CLOSE: {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
        this._raw(OP_CLOSE, payload.subarray(0, 2));
        this._closed = true;
        const t = setTimeout(() => { try { this.socket.destroy(); } catch { /* gone */ } }, 100);
        if (t.unref) t.unref();
        this.emit('close', code);
        break;
      }
      default:
        throw new Error(`unsupported WS opcode ${opcode}`);
    }
    if (!fin && opcode !== OP_TEXT) { /* single-frame messages only on read path */ }
  }

  _raw(opcode, payload) {
    if (this._closed || this.socket.destroyed) return false;
    this.socket.write(encodeWSFrame(opcode, payload, this._maskOutgoing)); // client frames masked, server frames plain (RFC 6455)
    return true;
  }

  send(text) {
    return this._raw(OP_TEXT, Buffer.from(String(text), 'utf8'));
  }

  close(code = 1000) {
    if (this._closed) return;
    const body = Buffer.allocUnsafe(2);
    body.writeUInt16BE(code, 0);
    this._raw(OP_CLOSE, body);
    this._closed = true;
    const t = setTimeout(() => { try { this.socket.destroy(); } catch { /* gone */ } }, 100);
    if (t.unref) t.unref();
    this.emit('close', code);
  }
}

function connectWS(url, { headers = {}, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const target = new URL(url);
    const secure = target.protocol === 'wss:';
    const port = Number(target.port) || (secure ? 443 : 80);
    const socket = secure
      ? tls.connect({ host: target.hostname, port, servername: target.hostname })
      : net.connect({ host: target.hostname, port });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('WebSocket handshake timed out'));
      }
    }, timeoutMs);

    let clientKey = null;
    socket.once(secure ? 'secureConnect' : 'connect', () => {
      clientKey = crypto.randomBytes(16).toString('base64');
      const lines = [
        `GET ${target.pathname}${target.search} HTTP/1.1`,
        `Host: ${target.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${clientKey}`,
        'Sec-WebSocket-Version: 13',
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        '\r\n',
      ];
      socket.write(lines.join('\r\n'));
    });

    let handshake = Buffer.alloc(0);
    const onData = (chunk) => {
      handshake = Buffer.concat([handshake, chunk]);
      const idx = handshake.indexOf('\r\n\r\n');
      if (idx === -1) return;
      const head = handshake.subarray(0, idx).toString('utf8');
      const rest = handshake.subarray(idx + 4);
      socket.off('data', onData);
      const statusLine = head.split('\r\n')[0] || '';
      const m = statusLine.match(/HTTP\/1\.[01] (\d{3})/);
      const accept = (head.match(/sec-websocket-accept:\s*(\S+)/i) || [])[1];
      if (!m || m[1] !== '101' || !clientKey || accept !== acceptKey(clientKey)) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`WebSocket handshake rejected: ${statusLine}`));
        }
        return;
      }
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const conn = new BridgeSocket(socket, { maskOutgoing: true });
        if (rest.length) socket.unshift(rest);
        resolve(conn);
      }
    };
    socket.on('data', onData);
    socket.once('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Bridge client
// ---------------------------------------------------------------------------

/**
 * Creates a bridge client that connects a Manya-OS process to a Manya relay.
 *
 * @param {object} options
 * @param {string} options.url - Manya relay endpoint (ws://host:port/wire).
 * @param {object} options.identity - { id, kind, displayName, domains, capabilities }.
 * @param {string} [options.secret] - shared secret for HMAC-proved hello.
 * @param {object} [options.fabric] - an OS EventFabric (or any object with
 *   on('published', cb) and publish(event)).
 * @param {string[]} [options.topics] - fabric topics forwarded outbound; default: all.
 * @param {object} [options.collaborationQueue] - optional queue with enqueue(event) —
 *   inbound collaboration.request events are routed here.
 * @param {(frame: object) => void} [options.onFrame] - observes every inbound frame.
 * @returns {BridgeClient}
 */
export function createBridgeClient(options = {}) {
  if (!options.url) throw new Error('createBridgeClient requires a relay url');
  const identity = options.identity || { id: `manya-os-${crypto.randomUUID().slice(0, 6)}`, kind: 'service' };
  const selfId = identity.id;
  const secret = options.secret || null;
  const fabric = options.fabric || null;
  const topics = options.topics || null;
  const collaborationQueue = options.collaborationQueue || null;

  const stats = {
    framesIn: 0,
    framesOut: 0,
    publishedIntoFabric: 0,
    forwardedToWire: 0,
    droppedLoops: 0,
    reconnects: 0,
  };
  const frameListeners = new Set();
  let conn = null;
  let stopped = false;
  let reconnectTimer = null;
  let offFabricPublished = null;

  function emitFrame(frame) {
    for (const listener of frameListeners) {
      try { listener(frame); } catch { /* listener errors isolated */ }
    }
  }

  function handleInbound(raw) {
    stats.framesIn++;
    const decoded = decodeFrame(raw);
    if (!decoded.ok) return;
    const frame = decoded.frame;
    emitFrame(frame);

    switch (frame.type) {
      case 'event': {
        const { topic, type, sourceToolId, payload } = frame.payload || {};
        if (frame.origin === selfId) {
          stats.droppedLoops++;
          return; // our own echo
        }
        if (collaborationQueue && topic === 'collaboration.request') {
          // Translate the wire frame into the platform's CollaborationRequestEvent
          // shape (see @manya-os/nervous-system's CollaborationRequestQueue):
          // requestType/target are siblings of payload, not nested inside it.
          const p = payload && typeof payload === 'object' ? payload : {};
          const { requestType, target, ...rest } = p;
          try {
            collaborationQueue.enqueue({
              id: frame.id,
              topic: 'collaboration.request',
              source: frame.origin,
              target: target || selfId,
              requestType: requestType || 'sync',
              payload: rest,
              createdAt: frame.ts,
              expiresAt: frame.ts + 300_000,
            });
          } catch { /* queue errors isolated */ }
        }
        if (collaborationQueue && CONNECTION_TOPICS.includes(topic)) {
          // Connection authorization over the wire, translated into the
          // platform's CollaborationRequestEvent shape. Consent is the one
          // thing the bridge never relaxes: a grant reaches the queue only
          // with a known method (and a real 7-character code, for CODE).
          // Invalid grants still publish into the fabric as observations.
          const p = payload && typeof payload === 'object' ? payload : {};
          const kind =
            topic === 'connection.request' ? 'request' :
            topic === 'connection.grant' ? 'grant' : 'revoke';
          const requestType = kind === 'request' ? 'grant-request' : kind;
          const grantValid = kind !== 'grant' || (
            CONNECTION_METHODS.includes(p.method) &&
            (p.method !== 'CODE' || isValidPairingCode(p.code))
          );
          if (grantValid) {
            const { requestId, target, method, approvedBy, code, note, reason, ...rest } = p;
            const connPayload = { connection: kind, requestId, ...rest };
            if (method !== undefined) connPayload.method = method;
            if (approvedBy !== undefined) connPayload.approvedBy = approvedBy;
            if (code !== undefined) connPayload.code = String(code).toUpperCase();
            if (note !== undefined) connPayload.note = note;
            if (reason !== undefined) connPayload.reason = reason;
            try {
              collaborationQueue.enqueue({
                id: frame.id,
                topic: 'collaboration.request',
                source: frame.origin,
                target: target || selfId,
                requestType,
                payload: connPayload,
                createdAt: frame.ts,
                expiresAt: frame.ts + 300_000,
              });
            } catch { /* queue errors isolated */ }
          }
        }
        if (fabric && typeof fabric.publish === 'function') {
          fabric.publish({
            id: `evt-${crypto.randomUUID().slice(0, 12)}`,
            topic: topic || 'wire.remote',
            source: sourceToolId || `wire:${frame.origin}`,
            payload: { ...(payload || {}), wireOrigin: frame.origin, wireHop: frame.hop },
            timestamp: frame.ts,
            severity: 'info',
            tags: ['wire'],
            metadata: { via: 'wire', origin: frame.origin },
          });
          stats.publishedIntoFabric++;
        }
        break;
      }
      default:
        break; // presence/welcome/error observed via onFrame
    }
  }

  function attachFabric() {
    if (!fabric || typeof fabric.on !== 'function') return;
    offFabricPublished = fabric.on('published', (event) => {
      if (!conn || stopped) return;
      const source = event.source || '';
      if (source === selfId || (event.metadata && event.metadata.via === 'wire')) {
        stats.droppedLoops++;
        return; // never echo wire-sourced events back
      }
      if (topics && !topics.includes(event.topic)) return;
      const frame = createFrame({
        type: 'event',
        origin: selfId,
        payload: {
          topic: event.topic,
          type: event.type || 'fabric-event',
          sourceToolId: source,
          payload: event.payload,
        },
      });
      if (conn.send(encodeFrame(frame))) stats.framesOut++;
      stats.forwardedToWire++;
    });
  }

  function dial() {
    connectWS(options.url)
      .then((socket) => {
        if (stopped) {
          socket.close();
          return;
        }
        conn = socket;
        const hello = createFrame({
          type: 'hello',
          origin: selfId,
          payload: {
            identity: {
              id: selfId,
              kind: identity.kind || 'service',
              displayName: identity.displayName || selfId,
              domains: identity.domains || ['technical'],
              capabilities: identity.capabilities || [],
            },
            ...(secret ? { proof: proofFor(selfId, secret) } : {}),
          },
        });
        socket.send(encodeFrame(hello));
        stats.framesOut++;
        socket.on('message', handleInbound);
        socket.on('close', () => {
          conn = null;
          if (!stopped) {
            stats.reconnects++;
            scheduleReconnect();
          }
        });
        socket.on('error', () => { /* close handler drives reconnect */ });
      })
      .catch(() => {
        if (!stopped) scheduleReconnect();
      });
  }

  function scheduleReconnect() {
    if (reconnectTimer || stopped) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) dial();
    }, 2000);
  }

  attachFabric();
  dial();

  return {
    identity,
    stats,
    get connected() { return !!conn; },
    onFrame(listener) {
      frameListeners.add(listener);
      return () => frameListeners.delete(listener);
    },
    /** Publishes an arbitrary wire event frame to the relay now. */
    publishEvent({ topic, type, sourceToolId, payload }) {
      if (!conn) return 0;
      const frame = createFrame({ type: 'event', origin: selfId, payload: { topic, type, sourceToolId, payload } });
      const sent = conn.send(encodeFrame(frame));
      if (sent) stats.framesOut++;
      return sent ? 1 : 0;
    },
    async stop() {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (offFabricPublished) {
        try { offFabricPublished(); } catch { /* already off */ }
        offFabricPublished = null;
      }
      if (conn) {
        try { conn.send(encodeFrame(createFrame({ type: 'bye', origin: selfId }))); } catch { /* gone */ }
        conn.close(1000);
        conn = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Minimal relay (test + demo harness; production relays live in Manya)
// ---------------------------------------------------------------------------

/**
 * Boots a minimal wire relay with the same hello/welcome/event semantics as
 * @manya/transport's server mode. Useful for tests, local demos, and as the
 * reference for OS-side interop.
 */
export function createRelay({ port = 0, host = '127.0.0.1', path = '/wire', secret = null, identity = { id: 'os-relay', kind: 'service' } } = {}) {
  const server = http.createServer(() => {});
  const peers = new Map(); // connId -> { socket, hello }
  let connSeq = 0;

  function broadcast(frame, exceptConnId) {
    const raw = encodeFrame(frame);
    for (const [id, peer] of peers) {
      if (id === exceptConnId) continue;
      try { peer.socket.send(raw); } catch { /* gone */ }
    }
  }

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    if (head && head.length) socket.unshift(head);
    const connId = `relay-peer-${++connSeq}`;
    const peer = { socket: null, hello: null };
    peers.set(connId, peer);

    const conn = new BridgeSocket(socket, { maskOutgoing: false });
    peer.socket = conn;
    conn.on('message', (raw) => {
      const decoded = decodeFrame(raw);
      if (!decoded.ok) return;
      const frame = decoded.frame;
      if (frame.type === 'hello') {
        if (secret && !verifyProof(frame.payload, secret)) {
          conn.close(1008);
          peers.delete(connId);
          return;
        }
        peer.hello = frame.payload && frame.payload.identity;
        conn.send(encodeFrame(createFrame({
          type: 'welcome',
          origin: identity.id,
          payload: { relay: identity, presence: [...peers.values()].map((p) => p.hello).filter(Boolean) },
        })));
        broadcast(createFrame({
          type: 'presence',
          origin: identity.id,
          payload: { status: 'joined', entity: peer.hello },
        }), connId);
        return;
      }
      if (frame.type === 'bye') {
        conn.close(1000);
        return;
      }
      if ((frame.type === 'event' || frame.type === 'presence') && shouldRelay(frame, identity.id)) {
        const relayed = createFrame({
          type: frame.type,
          origin: frame.origin,
          hop: Math.max(0, frame.hop - 1),
          payload: frame.payload,
        });
        broadcast(relayed, connId);
      }
    });
    conn.on('close', () => {
      peers.delete(connId);
      if (peer.hello) {
        broadcast(createFrame({
          type: 'presence',
          origin: identity.id,
          payload: { status: 'left', entity: peer.hello },
        }));
      }
    });
    conn.on('error', () => { /* close handles cleanup */ });
  });

  const relayApi = {
    identity,
    peerCount: () => peers.size,
    start() {
      return new Promise((resolve) => {
        server.listen(port, host, () => resolve(relayApi));
      });
    },
    url() {
      const address = server.address();
      if (!address) return null;
      return `ws://${address.address === '::' ? 'localhost' : address.address}:${address.port}${path}`;
    },
    async stop() {
      for (const [, peer] of peers) {
        try { peer.socket.close(1000); } catch { /* gone */ }
      }
      peers.clear();
      await new Promise((resolve) => server.close(resolve));
    },
  };

  return relayApi;
}
