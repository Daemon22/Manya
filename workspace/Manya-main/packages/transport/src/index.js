/**
 * Manya Transport — public API.
 *
 * Remote transport for Manya's nervous system: WebSocket relay + client,
 * unified wire protocol, presence map of connected entities, and a
 * bridge that connects @manya/unify's in-process bus to remote peers.
 */

export {
  PROTOCOL_VERSION,
  MAX_HOP,
  FRAME_TYPES,
  createFrame,
  encodeFrame,
  decodeFrame,
  shouldRelay,
  decrementHop,
  createHello,
  proofFor,
  verifyProof,
} from './protocol.js';

export {
  encodeWSFrame,
  WSConnection,
  attachWSServer,
  connectWS,
} from './wire.js';

export {
  createPresenceRegistry,
  createTransport,
  bridgeBusToTransport,
} from './transport.js';

/** Default export groups the runtime-facing surface for convenience. */
import { createTransport, createPresenceRegistry, bridgeBusToTransport } from './transport.js';

const transport = {
  createTransport,
  createPresenceRegistry,
  bridgeBusToTransport,
};

export default transport;
