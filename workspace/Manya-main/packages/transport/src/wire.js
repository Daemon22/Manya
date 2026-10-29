/**
 * Manya Transport — Zero-dependency WebSocket (RFC 6455).
 *
 * Implements just enough of RFC 6455 for Manya's wire protocol: text
 * messages, ping/pong, close handshake, and fragmented text messages.
 * Deliberately dependency-free so the Manya runtime keeps its zero-runtime-dep
 * property — no `ws` package required.
 *
 * Server side: attachWSServer(httpServer, { path, onConnection }) hooks the
 * HTTP server's 'upgrade' event.
 * Client side: connectWS('ws://host:port/path') performs the opening handshake
 * over a raw socket (TLS via node:tls for wss://).
 *
 * All data messages are UTF-8 text carrying JSON wire frames (see protocol.js).
 */

import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024; // 8 MiB safety cap per message

const OP_CONT = 0x0;
const OP_TEXT = 0x1;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
}

/**
 * Encodes one WebSocket frame.
 * @param {number} opcode
 * @param {Buffer} payload
 * @param {boolean} mask - clients must mask; servers must not
 * @returns {Buffer}
 */
export function encodeWSFrame(opcode, payload, mask) {
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
  header[0] = 0x80 | opcode; // FIN set, no fragmentation on write
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

/**
 * A single WebSocket connection (both roles).
 * Emits: 'message' (string), 'close' (code), 'error' (Error), and inherits
 * EventEmitter.
 */
export class WSConnection extends EventEmitter {
  /**
   * @param {net.Socket} socket
   * @param {{ role: 'server'|'client' }} opts
   */
  constructor(socket, { role }) {
    super();
    this.socket = socket;
    this.role = role; // 'server' receives masked frames; 'client' receives unmasked
    this._buffer = Buffer.alloc(0);
    this._fragments = [];
    this._fragOpcode = 0;
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
    socket.on('end', () => {
      if (!this._closed) {
        this._closed = true;
        this.emit('close', 1006);
      }
    });
  }

  get readyState() {
    return this._closed ? 'closed' : 'open';
  }

  _drain() {
    for (;;) {
      const frame = this._readFrame();
      if (!frame) break;
      this._handleFrame(frame);
      if (this._closed) break;
    }
  }

  _readFrame() {
    const buf = this._buffer;
    if (buf.length < 2) return null;
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buf.length < offset + 2) return null;
      len = buf.readUInt16BE(offset);
      offset += 2;
    } else if (len === 127) {
      if (buf.length < offset + 8) return null;
      const big = buf.readBigUInt64BE(offset);
      if (big > BigInt(MAX_MESSAGE_BYTES)) throw new Error('WS frame too large');
      len = Number(big);
      offset += 8;
    }
    if (len > MAX_MESSAGE_BYTES) throw new Error('WS frame too large');
    let maskKey = null;
    if (masked) {
      if (buf.length < offset + 4) return null;
      maskKey = buf.subarray(offset, offset + 4);
      offset += 4;
    }
    if (buf.length < offset + len) return null;
    let payload = Buffer.from(buf.subarray(offset, offset + len)); // copy: safe from buffer reuse
    this._buffer = buf.subarray(offset + len);
    if (maskKey) {
      for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i & 3];
    }
    return { fin, opcode, payload };
  }

  _handleFrame({ fin, opcode, payload }) {
    switch (opcode) {
      case OP_TEXT:
      case OP_CONT: {
        if (opcode === OP_TEXT) {
          this._fragments = [payload];
          this._fragOpcode = OP_TEXT;
        } else {
          this._fragments.push(payload);
        }
        if (fin) {
          const total = this._fragments.reduce((n, f) => n + f.length, 0);
          if (total > MAX_MESSAGE_BYTES) throw new Error('WS message too large');
          const message = Buffer.concat(this._fragments).toString('utf8');
          this._fragments = [];
          this.emit('message', message);
        }
        break;
      }
      case OP_PING:
        this._sendRaw(OP_PONG, payload);
        this.emit('ping');
        break;
      case OP_PONG:
        this.emit('pong');
        break;
      case OP_CLOSE: {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
        this._sendRaw(OP_CLOSE, payload.subarray(0, 2)); // echo close
        this._closed = true;
        this._destroySoon();
        this.emit('close', code);
        break;
      }
      default:
        throw new Error(`unsupported WS opcode ${opcode}`);
    }
  }

  _sendRaw(opcode, payload) {
    if (this._closed || this.socket.destroyed) return false;
    const masked = this.role === 'client';
    this.socket.write(encodeWSFrame(opcode, payload, masked));
    return true;
  }

  /** Tears the underlying socket down after queued writes flush. */
  _destroySoon() {
    const timer = setTimeout(() => {
      try { this.socket.destroy(); } catch { /* already gone */ }
    }, 100);
    if (typeof timer.unref === 'function') timer.unref();
  }

  /** Sends a text message (JSON wire frame string). */
  send(text) {
    if (typeof text !== 'string') throw new Error('WSConnection.send expects a string');
    return this._sendRaw(OP_TEXT, Buffer.from(text, 'utf8'));
  }

  ping() {
    return this._sendRaw(OP_PING, Buffer.alloc(0));
  }

  /** Begins the closing handshake. */
  close(code = 1000) {
    if (this._closed) return;
    const body = Buffer.allocUnsafe(2);
    body.writeUInt16BE(code, 0);
    this._sendRaw(OP_CLOSE, body);
    this._closed = true;
    this._destroySoon();
    this.emit('close', code);
  }
}

/**
 * Attaches a WebSocket endpoint to an existing HTTP server.
 * @param {http.Server} server
 * @param {{ path?: string, onConnection?: (conn: WSConnection, req: http.IncomingMessage) => void }} opts
 * @returns {{ detach: () => void, connections: Set<WSConnection> }}
 */
export function attachWSServer(server, { path = '/wire', onConnection } = {}) {
  const connections = new Set();
  const listener = (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    const upgrade = (req.headers.upgrade || '').toLowerCase();
    if (upgrade !== 'websocket' || !key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`,
      '\r\n',
    ].join('\r\n');
    socket.write(headers);
    const conn = new WSConnection(socket, { role: 'server' });
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
    if (head && head.length) socket.unshift(head);
    if (onConnection) onConnection(conn, req);
  };
  server.on('upgrade', listener);
  return {
    connections,
    detach: () => server.off('upgrade', listener),
  };
}

/**
 * Connects to a WebSocket endpoint.
 * @param {string} url - ws:// or wss:// URL
 * @param {{ headers?: Record<string,string>, timeoutMs?: number }} [opts]
 * @returns {Promise<WSConnection>} resolves on successful handshake
 */
export function connectWS(url, { headers = {}, timeoutMs = 10000 } = {}) {
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
        reject(new Error(`WebSocket handshake timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    socket.once(secure ? 'secureConnect' : 'connect', () => {
      clientKey = crypto.randomBytes(16).toString('base64');
      const pathWithQuery = `${target.pathname}${target.search}`;
      const lines = [
        `GET ${pathWithQuery || '/'} HTTP/1.1`,
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

    let handshakeBuffer = Buffer.alloc(0);
    let clientKey = null;
    const onHandshakeData = (chunk) => {
      handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
      const idx = handshakeBuffer.indexOf('\r\n\r\n');
      if (idx === -1) return;
      const head = handshakeBuffer.subarray(0, idx).toString('utf8');
      const rest = handshakeBuffer.subarray(idx + 4);
      socket.off('data', onHandshakeData);
      const statusLine = head.split('\r\n')[0] || '';
      const m = statusLine.match(/HTTP\/1\.[01] (\d{3})/);
      const acceptHeader = (head.match(/sec-websocket-accept:\s*(\S+)/i) || [])[1];
      if (!m || m[1] !== '101' || !clientKey || acceptHeader !== acceptKey(clientKey)) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`WebSocket handshake rejected: ${statusLine || 'no response'}`));
        }
        return;
      }
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const conn = new WSConnection(socket, { role: 'client' });
        if (rest.length) socket.unshift(rest);
        resolve(conn);
      }
    };
    socket.on('data', onHandshakeData);
    socket.once('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}
