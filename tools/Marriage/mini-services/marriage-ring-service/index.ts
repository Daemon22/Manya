import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ===== Types =====
interface ConnectedDevice {
  socketId: string
  deviceId: string
  name: string
  type: 'android' | 'pc'
  fingerprint: string
  platform?: string
  status: 'online' | 'offline' | 'busy'
  connectedAt: Date
  lastHeartbeat: Date
}

interface EngagementRequest {
  id: string
  fromDeviceId: string
  toPin: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: Date
}

interface MarriageProposal {
  id: string
  fromDeviceId: string
  toDeviceId: string
  vows?: string
  status: 'pending' | 'accepted' | 'rejected' | 'divorced'
  createdAt: Date
}

// ===== In-Memory State =====
const connectedDevices = new Map<string, ConnectedDevice>() // socketId -> device
const deviceSocketMap = new Map<string, string>() // deviceId -> socketId
const pendingEngagements = new Map<string, EngagementRequest>()
const pendingMarriageProposals = new Map<string, MarriageProposal>()
const marriedPairs = new Map<string, Set<string>>() // deviceId -> Set<partnerDeviceId>

// Heartbeat intervals
const heartbeatIntervals = new Map<string, NodeJS.Timeout>()

const generateId = () => Math.random().toString(36).substr(2, 12)
const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString()

// ===== Helper Functions =====
function getDeviceBySocket(socketId: string): ConnectedDevice | undefined {
  return connectedDevices.get(socketId)
}

function getSocketByDevice(deviceId: string): string | undefined {
  return deviceSocketMap.get(deviceId)
}

function broadcastDeviceList() {
  const devices = Array.from(connectedDevices.values()).map(d => ({
    deviceId: d.deviceId,
    name: d.name,
    type: d.type,
    platform: d.platform,
    status: d.status,
    connectedAt: d.connectedAt,
    lastHeartbeat: d.lastHeartbeat,
  }))
  io.emit('devices-updated', { devices })
}

function startHeartbeatMonitor(socketId: string) {
  const interval = setInterval(() => {
    const device = connectedDevices.get(socketId)
    if (!device) {
      clearInterval(interval)
      heartbeatIntervals.delete(socketId)
      return
    }

    const now = new Date()
    const elapsed = now.getTime() - device.lastHeartbeat.getTime()

    // If no heartbeat for 30 seconds, consider the device as having connection issues
    if (elapsed > 30000) {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('heartbeat-check', { timeout: true })
      }
    }

    // If no heartbeat for 60 seconds, disconnect
    if (elapsed > 60000) {
      console.log(`Device ${device.name} (${device.deviceId}) heartbeat timeout, disconnecting...`)
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.disconnect(true)
      }
      clearInterval(interval)
      heartbeatIntervals.delete(socketId)
    }
  }, 10000) // Check every 10 seconds

  heartbeatIntervals.set(socketId, interval)
}

// ===== Socket Event Handlers =====
io.on('connection', (socket) => {
  console.log(`[Marriage Ring] New connection: ${socket.id}`)

  // ---- Device Registration ----
  socket.on('register-device', (data: {
    deviceId: string
    name: string
    type: 'android' | 'pc'
    fingerprint: string
    platform?: string
  }) => {
    const device: ConnectedDevice = {
      socketId: socket.id,
      deviceId: data.deviceId,
      name: data.name,
      type: data.type,
      fingerprint: data.fingerprint,
      platform: data.platform,
      status: 'online',
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    }

    connectedDevices.set(socket.id, device)
    deviceSocketMap.set(data.deviceId, socket.id)

    // Start heartbeat monitoring
    startHeartbeatMonitor(socket.id)

    socket.emit('device-registered', {
      success: true,
      deviceId: data.deviceId,
      message: `${data.name} has entered the Marriage Ring!`
    })

    // Notify all devices
    broadcastDeviceList()
    io.emit('activity', {
      id: generateId(),
      type: 'engagement',
      title: `${data.name} entered the ring`,
      description: `A ${data.type} device has joined`,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] Device registered: ${data.name} (${data.type})`)
  })

  // ---- Heartbeat ----
  socket.on('heartbeat', (data: { deviceId: string }) => {
    const device = connectedDevices.get(socket.id)
    if (device) {
      device.lastHeartbeat = new Date()
      device.status = 'online'
      socket.emit('heartbeat-ack', { received: true, timestamp: new Date().toISOString() })
    }
  })

  // ---- Engagement (Temporal Connection) ----
  socket.on('request-engagement-pin', (data: { deviceId: string }) => {
    const pin = generatePin()
    const engagement: EngagementRequest = {
      id: generateId(),
      fromDeviceId: data.deviceId,
      toPin: pin,
      status: 'pending',
      createdAt: new Date(),
    }
    pendingEngagements.set(pin, engagement)

    socket.emit('engagement-pin-generated', {
      engagementId: engagement.id,
      pin,
      expiresIn: 300, // 5 minutes
      message: 'Share this PIN with the device you want to engage with'
    })

    // Auto-expire after 5 minutes
    setTimeout(() => {
      if (pendingEngagements.has(pin) && pendingEngagements.get(pin)?.status === 'pending') {
        const eng = pendingEngagements.get(pin)!
        eng.status = 'expired'
        pendingEngagements.delete(pin)
        socket.emit('engagement-expired', { pin, engagementId: eng.id })
      }
    }, 300000)

    console.log(`[Marriage Ring] Engagement PIN generated: ${pin} for device ${data.deviceId}`)
  })

  socket.on('engage-with-pin', (data: { pin: string; deviceId: string; name: string }) => {
    const engagement = pendingEngagements.get(data.pin)

    if (!engagement) {
      socket.emit('engagement-failed', { reason: 'Invalid PIN. The engagement may have expired.' })
      return
    }

    if (engagement.status !== 'pending') {
      socket.emit('engagement-failed', { reason: 'This PIN has already been used or expired.' })
      return
    }

    if (engagement.fromDeviceId === data.deviceId) {
      socket.emit('engagement-failed', { reason: 'You cannot engage with yourself!' })
      return
    }

    // Accept the engagement
    engagement.status = 'accepted'
    pendingEngagements.delete(data.pin)

    // Notify the requesting device
    const requesterSocketId = getSocketByDevice(engagement.fromDeviceId)
    if (requesterSocketId) {
      io.to(requesterSocketId).emit('engagement-accepted', {
        engagementId: engagement.id,
        partnerDeviceId: data.deviceId,
        partnerName: data.name,
        pin: data.pin,
        message: `${data.name} accepted your engagement! You are now connected.`
      })
    }

    // Notify the engaging device
    socket.emit('engagement-success', {
      engagementId: engagement.id,
      partnerDeviceId: engagement.fromDeviceId,
      partnerName: 'Partner',
      pin: data.pin,
      message: `Engagement successful! You are now connected.`
    })

    // Broadcast activity
    io.emit('activity', {
      id: generateId(),
      type: 'engagement',
      title: 'New Engagement!',
      description: `Two devices have engaged via PIN ${data.pin}`,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] Engagement established: PIN ${data.pin}`)
  })

  // ---- QR Code Engagement (faster connection) ----
  socket.on('engage-via-qr', (data: { pin: string; deviceId: string; name: string; token?: string }) => {
    const engagement = pendingEngagements.get(data.pin)

    if (!engagement) {
      socket.emit('engagement-failed', { reason: 'Invalid QR code. The engagement may have expired.' })
      return
    }

    if (engagement.status !== 'pending') {
      socket.emit('engagement-failed', { reason: 'This QR code has already been used or expired.' })
      return
    }

    if (engagement.fromDeviceId === data.deviceId) {
      socket.emit('engagement-failed', { reason: 'You cannot engage with yourself!' })
      return
    }

    // QR engagement is instant — token validation happens client-side
    engagement.status = 'accepted'
    pendingEngagements.delete(data.pin)

    const requesterSocketId = getSocketByDevice(engagement.fromDeviceId)

    if (requesterSocketId) {
      io.to(requesterSocketId).emit('engagement-accepted', {
        engagementId: engagement.id,
        partnerDeviceId: data.deviceId,
        partnerName: data.name,
        pin: data.pin,
        message: `${data.name} scanned your QR code! Engagement instant.`
      })
    }

    socket.emit('engagement-success', {
      engagementId: engagement.id,
      partnerDeviceId: engagement.fromDeviceId,
      partnerName: 'Partner',
      pin: data.pin,
      message: `QR scan successful! Instant engagement.`
    })

    io.emit('activity', {
      id: generateId(),
      type: 'engagement',
      title: 'QR Engagement!',
      description: `Two devices engaged instantly via QR scan`,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] QR Engagement established: PIN ${data.pin}`)
  })

  // ---- Marriage (Permanent Bond) ----
  socket.on('propose-marriage', (data: {
    fromDeviceId: string
    toDeviceId: string
    vows?: string
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (!targetSocketId) {
      socket.emit('marriage-proposal-failed', { reason: 'Target device is not online' })
      return
    }

    const proposal: MarriageProposal = {
      id: generateId(),
      fromDeviceId: data.fromDeviceId,
      toDeviceId: data.toDeviceId,
      vows: data.vows,
      status: 'pending',
      createdAt: new Date(),
    }

    pendingMarriageProposals.set(proposal.id, proposal)

    const fromDevice = connectedDevices.get(socket.id)

    // Send proposal to target device
    io.to(targetSocketId).emit('marriage-proposal-received', {
      proposalId: proposal.id,
      fromDeviceId: data.fromDeviceId,
      fromDeviceName: fromDevice?.name || 'Unknown Device',
      vows: data.vows,
      message: `${fromDevice?.name || 'A device'} wants to marry you!`
    })

    socket.emit('marriage-proposal-sent', {
      proposalId: proposal.id,
      toDeviceId: data.toDeviceId,
      message: 'Marriage proposal sent! Waiting for response...'
    })

    console.log(`[Marriage Ring] Marriage proposal: ${data.fromDeviceId} -> ${data.toDeviceId}`)
  })

  socket.on('accept-marriage', (data: { proposalId: string; deviceId: string }) => {
    const proposal = pendingMarriageProposals.get(data.proposalId)
    if (!proposal) {
      socket.emit('marriage-response-failed', { reason: 'Invalid proposal' })
      return
    }

    proposal.status = 'accepted'
    pendingMarriageProposals.delete(data.proposalId)

    // Record the marriage pair
    if (!marriedPairs.has(proposal.fromDeviceId)) {
      marriedPairs.set(proposal.fromDeviceId, new Set())
    }
    if (!marriedPairs.has(proposal.toDeviceId)) {
      marriedPairs.set(proposal.toDeviceId, new Set())
    }
    marriedPairs.get(proposal.fromDeviceId)!.add(proposal.toDeviceId)
    marriedPairs.get(proposal.toDeviceId)!.add(proposal.fromDeviceId)

    // Notify both devices
    const fromSocketId = getSocketByDevice(proposal.fromDeviceId)
    const accepterDevice = connectedDevices.get(socket.id)

    if (fromSocketId) {
      io.to(fromSocketId).emit('marriage-accepted', {
        proposalId: data.proposalId,
        partnerDeviceId: data.deviceId,
        partnerName: accepterDevice?.name || 'Partner',
        message: `Your marriage proposal was accepted! You are now married forever!`
      })
    }

    socket.emit('marriage-established', {
      proposalId: data.proposalId,
      partnerDeviceId: proposal.fromDeviceId,
      partnerName: 'Partner',
      message: `Marriage established! Your bond is forever!`
    })

    // Broadcast activity
    io.emit('activity', {
      id: generateId(),
      type: 'marriage',
      title: 'Marriage Established!',
      description: `Two devices have been married. Their bond is forever.`,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] Marriage established: ${proposal.fromDeviceId} <-> ${proposal.toDeviceId}`)
  })

  socket.on('reject-marriage', (data: { proposalId: string }) => {
    const proposal = pendingMarriageProposals.get(data.proposalId)
    if (!proposal) return

    proposal.status = 'rejected'
    pendingMarriageProposals.delete(data.proposalId)

    const fromSocketId = getSocketByDevice(proposal.fromDeviceId)
    if (fromSocketId) {
      io.to(fromSocketId).emit('marriage-rejected', {
        proposalId: data.proposalId,
        message: 'Your marriage proposal was declined.'
      })
    }

    socket.emit('marriage-rejection-sent', { proposalId: data.proposalId })
  })

  // ---- Divorce ----
  socket.on('divorce', (data: { fromDeviceId: string; toDeviceId: string }) => {
    const partnersA = marriedPairs.get(data.fromDeviceId)
    const partnersB = marriedPairs.get(data.toDeviceId)

    if (partnersA) partnersA.delete(data.toDeviceId)
    if (partnersB) partnersB.delete(data.fromDeviceId)

    if (partnersA && partnersA.size === 0) marriedPairs.delete(data.fromDeviceId)
    if (partnersB && partnersB.size === 0) marriedPairs.delete(data.toDeviceId)

    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('divorced', {
        fromDeviceId: data.fromDeviceId,
        message: 'Your marriage has been dissolved.'
      })
    }

    socket.emit('divorce-confirmed', { toDeviceId: data.toDeviceId })

    io.emit('activity', {
      id: generateId(),
      type: 'divorce',
      title: 'Marriage Dissolved',
      description: `A marriage bond has been broken.`,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] Divorce: ${data.fromDeviceId} <-> ${data.toDeviceId}`)
  })

  // ---- Command Execution (from PC to Android) ----
  socket.on('execute-command', (data: {
    fromDeviceId: string
    toDeviceId: string
    command: string
    commandId: string
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (!targetSocketId) {
      socket.emit('command-failed', {
        commandId: data.commandId,
        reason: 'Target device is not online'
      })
      return
    }

    // Check if married
    const partners = marriedPairs.get(data.fromDeviceId)
    const isMarried = partners?.has(data.toDeviceId)

    io.to(targetSocketId).emit('command-received', {
      commandId: data.commandId,
      fromDeviceId: data.fromDeviceId,
      command: data.command,
      isMarried,
      timestamp: new Date().toISOString(),
    })

    console.log(`[Marriage Ring] Command: ${data.command} from ${data.fromDeviceId} to ${data.toDeviceId}`)
  })

  socket.on('command-result', (data: {
    commandId: string
    fromDeviceId: string
    toDeviceId: string
    result: string
    success: boolean
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('command-response', {
        commandId: data.commandId,
        result: data.result,
        success: data.success,
        fromDeviceId: data.fromDeviceId,
      })
    }
  })

  // ---- File Transfer ----
  socket.on('initiate-transfer', (data: {
    fromDeviceId: string
    toDeviceId: string
    fileName: string
    fileSize: number
    transferId: string
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (!targetSocketId) {
      socket.emit('transfer-failed', {
        transferId: data.transferId,
        reason: 'Target device is not online'
      })
      return
    }

    const fromDevice = connectedDevices.get(socket.id)

    io.to(targetSocketId).emit('transfer-request', {
      transferId: data.transferId,
      fromDeviceId: data.fromDeviceId,
      fromDeviceName: fromDevice?.name || 'Unknown',
      fileName: data.fileName,
      fileSize: data.fileSize,
    })

    socket.emit('transfer-initiated', { transferId: data.transferId })
  })

  socket.on('accept-transfer', (data: { transferId: string; deviceId: string }) => {
    // In a real implementation, we'd handle chunked file transfer here
    const targetSocketId = getSocketByDevice(data.deviceId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('transfer-accepted', { transferId: data.transferId })
    }
  })

  socket.on('reject-transfer', (data: { transferId: string; deviceId: string }) => {
    const targetSocketId = getSocketByDevice(data.deviceId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('transfer-rejected', { transferId: data.transferId })
    }
  })

  // ---- Notification Relay ----
  socket.on('send-notification', (data: {
    fromDeviceId: string
    toDeviceId: string
    title: string
    body: string
    notificationId: string
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('notification-received', {
        notificationId: data.notificationId,
        fromDeviceId: data.fromDeviceId,
        title: data.title,
        body: data.body,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // ---- Get Online Devices ----
  socket.on('get-devices', () => {
    const devices = Array.from(connectedDevices.values()).map(d => ({
      deviceId: d.deviceId,
      name: d.name,
      type: d.type,
      platform: d.platform,
      status: d.status,
      connectedAt: d.connectedAt,
      lastHeartbeat: d.lastHeartbeat,
    }))
    socket.emit('devices-list', { devices })
  })

  // ---- Get Married Partners ----
  socket.on('get-married-partners', (data: { deviceId: string }) => {
    const partners = marriedPairs.get(data.deviceId)
    const partnerList = partners ? Array.from(partners) : []
    socket.emit('married-partners', { partners: partnerList })
  })

  // ---- Chat Message ----
  socket.on('chat-message', (data: {
    fromDeviceId: string
    toDeviceId: string
    message: string
    messageId: string
  }) => {
    const targetSocketId = getSocketByDevice(data.toDeviceId)
    const fromDevice = connectedDevices.get(socket.id)

    if (targetSocketId) {
      io.to(targetSocketId).emit('chat-message-received', {
        messageId: data.messageId,
        fromDeviceId: data.fromDeviceId,
        fromDeviceName: fromDevice?.name || 'Unknown',
        message: data.message,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    const device = connectedDevices.get(socket.id)
    if (device) {
      console.log(`[Marriage Ring] Device disconnected: ${device.name} (${device.deviceId})`)

      // Clean up
      connectedDevices.delete(socket.id)
      deviceSocketMap.delete(device.deviceId)

      // Clean up heartbeat monitor
      const interval = heartbeatIntervals.get(socket.id)
      if (interval) {
        clearInterval(interval)
        heartbeatIntervals.delete(socket.id)
      }

      // Notify married partners about disconnection
      const partners = marriedPairs.get(device.deviceId)
      if (partners) {
        partners.forEach(partnerId => {
          const partnerSocketId = getSocketByDevice(partnerId)
          if (partnerSocketId) {
            io.to(partnerSocketId).emit('partner-disconnected', {
              deviceId: device.deviceId,
              name: device.name,
              message: `${device.name} has gone offline. Your marriage persists.`
            })
          }
        })
      }

      // Broadcast activity
      io.emit('activity', {
        id: generateId(),
        type: 'heartbeat',
        title: `${device.name} left the ring`,
        description: 'Device disconnected',
        timestamp: new Date().toISOString(),
      })

      broadcastDeviceList()
    } else {
      console.log(`[Marriage Ring] Unknown connection closed: ${socket.id}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`[Marriage Ring] Socket error (${socket.id}):`, error)
  })
})

// ===== Start Server =====
const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[Marriage Ring] WebSocket server running on port ${PORT}`)
  console.log(`[Marriage Ring] Ready for engagements and marriages!`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Marriage Ring] Received SIGTERM, shutting down...')
  httpServer.close(() => {
    console.log('[Marriage Ring] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Marriage Ring] Received SIGINT, shutting down...')
  httpServer.close(() => {
    console.log('[Marriage Ring] Server closed')
    process.exit(0)
  })
})
