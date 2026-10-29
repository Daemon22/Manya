import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── Conclave signaling service ──────────────────────────────────────────
// Relays WebRTC offers/answers/ICE for mesh group calls (3+), carries the
// in-call chat, and reports live presence to the whole Manya surface.

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface Peer {
  socketId: string
  roomId: string
  name: string
  micOn: boolean
  camOn: boolean
}

const peers = new Map<string, Peer>() // socketId -> peer

const roomPeers = (roomId: string): Peer[] =>
  [...peers.values()].filter((p) => p.roomId === roomId)

io.on('connection', (socket) => {
  let peer: Peer | null = null

  socket.on('room:join', ({ roomId, name, micOn, camOn }: { roomId: string; name: string; micOn: boolean; camOn: boolean }) => {
    // Leave any previous room
    if (peer) {
      socket.leave(`room:${peer.roomId}`)
      socket.to(`room:${peer.roomId}`).emit('peer:left', { socketId: socket.id, name: peer.name })
    }
    peer = { socketId: socket.id, roomId, name: name || 'A signal', micOn: !!micOn, camOn: !!camOn }
    peers.set(socket.id, peer)
    socket.join(`room:${roomId}`)

    const others = roomPeers(roomId).filter((p) => p.socketId !== socket.id)
    socket.emit('room:peers', { peers: others })
    socket.to(`room:${roomId}`).emit('peer:joined', { peer })

    // Ambient system line — the room acknowledges arrival
    io.to(`room:${roomId}`).emit('chat', {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: 'Manya',
      body: `${peer.name} took a seat at the table.`,
      ts: Date.now(),
      kind: 'system',
    })
  })

  socket.on('room:leave', () => {
    if (!peer) return
    socket.leave(`room:${peer.roomId}`)
    socket.to(`room:${peer.roomId}`).emit('peer:left', { socketId: socket.id, name: peer.name })
    peers.delete(socket.id)
    peer = null
  })

  socket.on('media:state', ({ micOn, camOn }: { micOn: boolean; camOn: boolean }) => {
    if (!peer) return
    peer.micOn = micOn
    peer.camOn = camOn
    socket.to(`room:${peer.roomId}`).emit('peer:media', { socketId: socket.id, micOn, camOn })
  })

  // WebRTC mesh relay
  socket.on('rtc:offer', ({ to, sdp }: { to: string; sdp: unknown }) => {
    io.to(to).emit('rtc:offer', { from: socket.id, sdp })
  })
  socket.on('rtc:answer', ({ to, sdp }: { to: string; sdp: unknown }) => {
    io.to(to).emit('rtc:answer', { from: socket.id, sdp })
  })
  socket.on('rtc:ice', ({ to, candidate }: { to: string; candidate: unknown }) => {
    io.to(to).emit('rtc:ice', { from: socket.id, candidate })
  })

  socket.on('chat', ({ roomId, body, author }: { roomId: string; body: string; author: string }) => {
    io.to(`room:${roomId}`).emit('chat', {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author,
      body,
      ts: Date.now(),
      kind: 'user',
    })
  })

  socket.on('solid:raised', ({ roomId, line }: { roomId: string; line: string }) => {
    io.to(`room:${roomId}`).emit('solid:raised', { line, ts: Date.now() })
  })

  socket.on('disconnect', () => {
    if (!peer) return
    socket.to(`room:${peer.roomId}`).emit('peer:left', { socketId: socket.id, name: peer.name })
    peers.delete(socket.id)
  })
})

// Presence heartbeat — how many seats are occupied right now
setInterval(() => {
  io.emit('presence', { seated: peers.size })
}, 5000)

httpServer.listen(3003, () => {
  console.log('Conclave signaling service listening on :3003')
})
