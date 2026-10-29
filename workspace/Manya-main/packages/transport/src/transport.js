/**
 * Manya Transport — TransportLayer.
 *
 * The remote extension of Manya's in-process nervous system. A transport
 * connects one Manya runtime to peers (other runtimes, devices,
 * intelligences, Foundation services) over WebSocket, carries unify bus
 * events both ways, and maintains a live presence map of connected entities.
 *
 * Two modes:
 *   - 'server': binds a WebSocket endpoint (the "relay") other nodes dial.
 *   - 'client': dials a remote relay and exchanges frames with it.
 *
 * Every connection performs a hello/welcome handshake. Inbound and outbound
 * bus events are bridged by bridgeBusToTransport (see bridge.js), which
 * applies origin + hop based loop prevention so a frame never circulates.
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';

import {
  createFrame,
  decodeFrame,
  encodeFrame,
  shouldRelay,
  decrementHop,
  createHello,
  verifyProof,
} from './protocol.js';
import { attachWSServer, connectWS } from './wire.js';

/** Entities currently reachable through this transport. */
export function createPresenceRegistry() {
  const entities = new Map(); // id -> { identity, connectedAt, lastSeenAt, via: 'local'|'remote' }

  return {
    upsert(identity, via = 'remote') {
      if (!identity || !identity.id) throw new Error('presence.upsert requires an identity with id');
      const now = Date.now();
      const existing = entities.get(identity.id);
      entities.set(identity.id, {
        identity,
        via,
        connectedAt: existing ? existing.connectedAt : now,
        lastSeenAt: now,
      });
      return entities.get(identity.id);
    },
    touch(id) {
      const entry = entities.get(id);
      if (entry) entry.lastSeenAt = Date.now();
      return entry || null;
    },
    remove(id) {
      return entities.delete(id);
    },
    get(id) {
      return entities.get(id) || null;
    },
    list({ kind, domain, via } = {}) {
      return [...entities.values()].filter((entry) => {
        if (kind && entry.identity.kind !== kind) return false;
        if (domain && !(entry.identity.domains || []).includes(domain)) return false;
        if (via && entry.via !== via) return false;
        return true;
      });
    },
    size() {
      return entities.size;
    },
    clear() {
      entities.clear();
    },
  };
}

/**
 * Creates a transport layer.
 * @param {object} options
 * @param {'server'|'client'} [options.mode='server']
 * @param {object} options.identity - This node's identity descriptor { id, kind, displayName, domains, capabilities }.
 * @param {{ port?: number, host?: string, path?: string }} [options.listen] - server mode bind config.
 * @param {string} [options.url] - client mode relay URL (ws://host:port/wire).
 * @param {string} [options.secret] - shared secret; hello frames are HMAC-proved and verified.
 * @param {number} [options.maxPeers=64]
 * @returns {Transport}
 */
export function createTransport(options = {}) {
  const mode = options.mode || 'server';
  if (!options.identity || !options.identity.id) {
    throw new Error('createTransport requires an identity with an id');
  }
  const identity = options.identity;
  const selfId = identity.id;
  const secret = options.secret || null;
  const maxPeers = options.maxPeers || 64;

  const presence = createPresenceRegistry();
  presence.upsert({ ...identity }, 'local');

  const frameHandlers = new Set();
  const peerHandlers = new Set();
  const server = mode === 'server' ? http.createServer(() => {}) : null;
  let wsHandle = null; // attachWSServer handle (server mode)
  let clientConn = null; // WSConnection (client mode)
  let reconnectTimer = null;
  let stopped = false;

  const peers = new Map(); // connId -> { conn, identity, remoteAddress, connectedAt }
  const stats = {
    framesIn: 0,
    framesOut: 0,
    framesDropped: 0,
    framesRelayed: 0,
    rejected: 0,
    connects: 0,
    disconnects: 0,
  };

  function emitFrame(frame, peerConnId) {
    for (const handler of frameHandlers) {
      try {
        handler(frame, peerConnId);
      } catch { /* handler errors must not break the transport */ }
    }
  }

  function emitPeer(event, peerInfo) {
    for (const handler of peerHandlers) {
      try {
        handler(event, peerInfo);
      } catch { /* ignore */ }
    }
  }

  function relayToOthers(frame, exceptConnId) {
    if (!shouldRelay(frame, selfId)) return 0;
    const relayFrame = createFrame({
      type: frame.type,
      payload: frame.payload,
      origin: frame.origin,
      hop: decrementHop(frame).hop,
    });
    let sent = 0;
    for (const [connId, peer] of peers) {
      if (connId === exceptConnId) continue;
      if (peer.conn.send(encodeFrame(relayFrame))) sent++;
    }
    if (sent > 0) stats.framesRelayed += sent;
    return sent;
  }

  function handleMessage(raw, connId) {
    stats.framesIn++;
    const decoded = decodeFrame(raw);
    if (!decoded.ok) {
      stats.framesDropped++;
      if (connId) {
        const peer = peers.get(connId);
        if (peer) {
          peer.conn.send(encodeFrame(createFrame({
            type: 'error',
            origin: selfId,
            payload: { code: 'bad_frame', message: decoded.error },
          })));
        }
      }
      return;
    }
    const frame = decoded.frame;

    // Update liveness for whatever peer sent this.
    if (connId) presence.touch(frame.origin);

    switch (frame.type) {
      case 'hello': {
        const peer = connId ? peers.get(connId) : null;
        if (secret && !verifyProof(frame.payload, secret)) {
          stats.rejected++;
          if (peer) peer.conn.close(1008);
          return;
        }
        const inc = frame.payload && frame.payload.identity;
        if (!inc || !inc.id) {
          stats.framesDropped++;
          return;
        }
        if (peer) {
          peer.identity = inc;
          presence.upsert(inc, 'remote');
          peer.conn.send(encodeFrame(createFrame({
            type: 'welcome',
            origin: selfId,
            payload: {
              relay: identity,
              presence: presence.list().map((e) => e.identity),
            },
          })));
          emitPeer('joined', { connId, identity: inc });
          const joinFrame = createFrame({
            type: 'presence',
            origin: selfId,
            payload: { status: 'joined', entity: inc },
          });
          for (const [otherId, other] of peers) {
            if (otherId !== connId) other.conn.send(encodeFrame(joinFrame));
          }
        }
        break;
      }
      case 'welcome': {
        // Client mode: relay accepted us; register announced presence.
        const announced = (frame.payload && frame.payload.presence) || [];
        const relayIdentity = frame.payload && frame.payload.relay;
        if (relayIdentity) presence.upsert(relayIdentity, 'remote');
        for (const entity of announced) {
          if (entity && entity.id && entity.id !== selfId) presence.upsert(entity, 'remote');
        }
        emitFrame(frame, connId);
        break;
      }
      case 'presence': {
        const { status, entity } = (frame.payload || {});
        if (entity && entity.id) {
          if (status === 'joined') presence.upsert(entity, 'remote');
          if (status === 'left') presence.remove(entity.id);
        }
        emitFrame(frame, connId);
        relayToOthers(frame, connId);
        break;
      }
      case 'event': {
        emitFrame(frame, connId);
        relayToOthers(frame, connId);
        break;
      }
      case 'ping':
        if (connId) {
          const peer = peers.get(connId);
          if (peer) peer.conn.send(encodeFrame(createFrame({ type: 'pong', origin: selfId })));
        } else if (clientConn) {
          clientConn.send(encodeFrame(createFrame({ type: 'pong', origin: selfId })));
        }
        break;
      case 'pong':
        break;
      case 'bye': {
        if (connId) {
          const peer = peers.get(connId);
          if (peer && peer.identity) {
            presence.remove(peer.identity.id);
            peer.conn.close(1000);
          }
        }
        break;
      }
      case 'error':
        emitFrame(frame, connId);
        break;
      default:
        stats.framesDropped++;
    }
  }

  function registerPeer(conn, req) {
    if (peers.size >= maxPeers) {
      stats.rejected++;
      conn.send(encodeFrame(createFrame({
        type: 'error',
        origin: selfId,
        payload: { code: 'max_peers', message: 'relay is at capacity' },
      })));
      conn.close(1013);
      return null;
    }
    const connId = `peer-${randomUUID().slice(0, 8)}`;
    const peer = {
      connId,
      conn,
      identity: null,
      remoteAddress: req ? req.socket.remoteAddress : null,
      connectedAt: Date.now(),
    };
    peers.set(connId, peer);
    stats.connects++;

    conn.on('message', (raw) => handleMessage(raw, connId));
    conn.on('close', () => {
      peers.delete(connId);
      stats.disconnects++;
      if (peer.identity) {
        presence.remove(peer.identity.id);
        emitPeer('left', { connId, identity: peer.identity });
        const leftFrame = createFrame({
          type: 'presence',
          origin: selfId,
          payload: { status: 'left', entity: peer.identity },
        });
        for (const [otherId, other] of peers) {
          if (otherId !== connId) other.conn.send(encodeFrame(leftFrame));
        }
      }
    });
    conn.on('error', () => { /* socket errors surface via close */ });
    return peer;
  }

  function dial(url) {
    connectWS(url)
      .then((conn) => {
        if (stopped) {
          conn.close();
          return;
        }
        clientConn = conn;
        conn.send(encodeFrame(createHello(identity, secret)));
        conn.on('message', (raw) => handleMessage(raw));
        conn.on('close', () => {
          clientConn = null;
          // Drop remote presence learned through this link.
          for (const entry of presence.list({ via: 'remote' })) presence.remove(entry.identity.id);
          if (!stopped) scheduleReconnect(url);
        });
        conn.on('error', () => { /* close handler manages reconnect */ });
      })
      .catch(() => {
        if (!stopped) scheduleReconnect(url);
      });
  }

  function scheduleReconnect(url) {
    if (reconnectTimer || stopped) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) dial(url);
    }, 2000);
  }

  const transport = {
    mode,
    identity,
    presence,
    stats,

    /** The http.Server carrying the wire endpoint (own or host-provided). */
    __httpServer() {
      const attached = options.listen && options.listen.server;
      const target = attached || server;
      const address = target && target.address && target.address();
      if (!address) return null;
      return {
        address: address.address === '::' ? 'localhost' : address.address,
        port: address.port,
      };
    },

    get url() {
      if (mode === 'server') {
        const host = transport.__httpServer();
        if (!host) return null;
        return `ws://${host.address}:${host.port}${(options.listen && options.listen.path) || '/wire'}`;
      }
      return options.url || null;
    },

    /** Resolves when server mode is listening (client mode resolves immediately).
     *  Server mode accepts an existing http.Server via options.listen.server,
     *  so a host application can expose the wire endpoint on its own port. */
    start() {
      if (mode === 'server') {
        const path = (options.listen && options.listen.path) || '/wire';
        const existing = options.listen && options.listen.server;
        if (existing) {
          wsHandle = attachWSServer(existing, {
            path,
            onConnection: (conn, req) => registerPeer(conn, req),
          });
          return Promise.resolve(transport);
        }
        const port = (options.listen && options.listen.port) || 3400;
        const host = (options.listen && options.listen.host) || '127.0.0.1';
        wsHandle = attachWSServer(server, {
          path,
          onConnection: (conn, req) => registerPeer(conn, req),
        });
        return new Promise((resolve) => {
          server.listen(port, host, () => resolve(transport));
        });
      }
      dial(options.url);
      return Promise.resolve(transport);
    },

    /** Publishes a bus event to every connected peer (and relays inbound ones). */
    publishEvent({ topic, type, sourceToolId, payload }) {
      const frame = createFrame({
        type: 'event',
        origin: selfId,
        payload: { topic, type, sourceToolId, payload },
      });
      let sent = 0;
      for (const [, peer] of peers) {
        if (peer.conn.send(encodeFrame(frame))) sent++;
      }
      if (clientConn && clientConn.send(encodeFrame(frame))) sent++;
      stats.framesOut += sent;
      return sent;
    },

    /** Sends any frame to all peers. */
    broadcast(frame) {
      let sent = 0;
      for (const [, peer] of peers) {
        if (peer.conn.send(encodeFrame(frame))) sent++;
      }
      if (clientConn && clientConn.send(encodeFrame(frame))) sent++;
      stats.framesOut += sent;
      return sent;
    },

    onFrame(handler) {
      frameHandlers.add(handler);
      return () => frameHandlers.delete(handler);
    },

    onPeer(handler) {
      peerHandlers.add(handler);
      return () => peerHandlers.delete(handler);
    },

    /** Connected peers (server mode) or link state (client mode). */
    listPeers() {
      return [...peers.values()].map((p) => ({
        connId: p.connId,
        identity: p.identity,
        remoteAddress: p.remoteAddress,
        connectedAt: p.connectedAt,
      }));
    },

    isConnected() {
      return mode === 'server' ? peers.size > 0 : !!clientConn;
    },

    async stop() {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      for (const [, peer] of peers) {
        try {
          peer.conn.send(encodeFrame(createFrame({ type: 'bye', origin: selfId })));
        } catch { /* ignore */ }
        peer.conn.close(1000);
      }
      peers.clear();
      if (clientConn) {
        clientConn.close(1000);
        clientConn = null;
      }
      if (wsHandle) {
        wsHandle.detach();
        wsHandle = null;
      }
      if (server && server.listening) {
        await new Promise((resolve) => server.close(() => resolve()));
      }
      return transport;
    },
  };

  return transport;
}

/**
 * Bridges a unify event bus to a transport: local bus channels flow out,
 * remote event frames flow in (marked source 'transport:remote').
 * Loop prevention: frames relayed with origin !== selfId are re-published
 * locally but never re-published back out.
 * @param {object} args
 * @param {object} args.bus - unify bus (from @manya/unify createBus).
 * @param {object} args.transport - transport from createTransport.
 * @param {string[]} [args.channels] - channels to forward outward; default: forwarded via routeEvent discovery is caller's job, so pass explicit list.
 * @param {object} [args.unify] - unify module (import('@manya/unify')); required for inbound republish.
 * @returns {{ detach: () => void, inbound: number, outbound: number }}
 */
export function bridgeBusToTransport({ bus, transport, channels, unify }) {
  const counters = { inbound: 0, outbound: 0 };
  const unsubscribes = [];

  if (unify && Array.isArray(channels)) {
    for (const channel of channels) {
      const off = unify.subscribe(bus, channel, (event) => {
        counters.outbound++;
        transport.publishEvent({
          topic: event.topic || channel,
          type: event.type,
          sourceToolId: event.sourceToolId,
          payload: event.payload,
        });
      });
      unsubscribes.push(off);
    }
  }

  const offFrame = transport.onFrame((frame) => {
    if (frame.type !== 'event' || !unify || !bus) return;
    // Remote events are delivered locally with their remote origin preserved;
    // they must NOT be forwarded again (origin check in shouldRelay guards
    // the relay path; here we simply never republish to the transport).
    counters.inbound++;
    const { topic, type, sourceToolId, payload } = frame.payload || {};
    unify.publish(bus, topic || 'transport:remote', {
      type: type || 'remote-event',
      sourceToolId: sourceToolId || 'transport:remote',
      payload: { ...(payload || {}), remoteOrigin: frame.origin, remoteHop: frame.hop },
    });
  });

  return {
    detach() {
      for (const off of unsubscribes) off();
      offFrame();
    },
    get inbound() { return counters.inbound; },
    get outbound() { return counters.outbound; },
  };
}
