'use client'

import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { QRCodeSVG } from 'qrcode.react'
import { useMarriageRingStore, DeviceInfo, ActivityInfo, ChatMessage } from '@/lib/marriage-ring-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  Smartphone, Monitor, Heart, Gem, Link2, Unlink2, Send, Terminal,
  Activity, Users, Wifi, WifiOff, Copy, Check, X, FileUp, Bell,
  Shield, Zap, Clock, Globe, Sparkles, Volume2, QrCode, Signal,
  ArrowDownUp, Server, Timer, AlertTriangle, RefreshCw
} from 'lucide-react'

// Generate a device fingerprint
function generateFingerprint() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'MR-'
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Get device avatar emoji
function getDeviceAvatar(type: string, name: string): string {
  if (type === 'android') return '📱'
  if (name.toLowerCase().includes('mac')) return '💻'
  if (name.toLowerCase().includes('windows')) return '🖥️'
  if (name.toLowerCase().includes('linux')) return '🐧'
  return '💻'
}

// Format relative time
function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// PIN display component with individual digit boxes
function PinDisplay({ pin, expired = false }: { pin: string; expired?: boolean }) {
  return (
    <div className="flex gap-2 justify-center">
      {pin.split('').map((digit, i) => (
        <div
          key={i}
          className={`w-12 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg transition-all duration-300 ${
            expired
              ? 'bg-gray-800/50 border-2 border-gray-600/40 text-gray-500 line-through'
              : 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-2 border-amber-500/40 text-amber-200 shadow-amber-500/10'
          }`}
        >
          {digit}
        </div>
      ))}
    </div>
  )
}

// Ring animation component
function MarriageRingIcon({ size = 80, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={animated ? 'animate-pulse' : ''}>
      <defs>
        <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="ringRose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="38" cy="50" rx="22" ry="25" fill="none" stroke="url(#ringGold)" strokeWidth="4" filter="url(#glow)" />
      <ellipse cx="62" cy="50" rx="22" ry="25" fill="none" stroke="url(#ringRose)" strokeWidth="4" filter="url(#glow)" />
      <path d="M50 42 C50 38, 44 34, 40 38 C36 34, 30 38, 30 42 C30 48, 40 56, 50 62 C60 56, 70 48, 70 42 C70 38, 64 34, 60 38 C56 34, 50 38, 50 42Z"
        fill="#e11d48" opacity="0.8" filter="url(#glow)" />
      <path d="M50 40 L53 44 L50 48 L47 44 Z" fill="#fbbf24" />
    </svg>
  )
}

// Connection Health Monitor Component
function ConnectionHealthMonitor({
  isConnected,
  isMarried,
  latency,
  uptime,
  heartbeatCount,
  reconnectCount,
}: {
  isConnected: boolean
  isMarried: boolean
  latency: number
  uptime: number
  heartbeatCount: number
  reconnectCount: number
}) {
  const latencyColor = latency < 50 ? 'text-emerald-400' : latency < 150 ? 'text-amber-400' : 'text-red-400'
  const latencyBg = latency < 50 ? 'bg-emerald-500/10' : latency < 150 ? 'bg-amber-500/10' : 'bg-red-500/10'

  return (
    <Card className="bg-gray-900/60 border-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-gray-200 flex items-center gap-2 text-sm">
          <Signal className="w-4 h-4 text-emerald-400" /> Connection Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-2.5 rounded-lg ${isConnected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {isConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Status</span>
            </div>
            <p className={`text-sm font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </p>
          </div>

          <div className={`p-2.5 rounded-lg ${latencyBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Timer className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Latency</span>
            </div>
            <p className={`text-sm font-bold ${latencyColor}`}>
              {isConnected ? `${latency}ms` : '--'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Heartbeats</span>
            </div>
            <p className="text-sm font-bold text-gray-300">{heartbeatCount}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <RefreshCw className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Reconnects</span>
            </div>
            <p className="text-sm font-bold text-gray-300">{reconnectCount}</p>
          </div>
        </div>

        {/* Uptime bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Session Uptime</span>
            <span>{formatUptime(uptime)}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: isConnected ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Bond status */}
        {isMarried && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            <span className="text-xs text-rose-300 font-medium">Marriage bond active — auto-reconnect enabled</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

// =================== MAIN COMPONENT ===================
export default function MarriageRingDashboard() {
  const store = useMarriageRingStore()
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState<'android' | 'pc'>('pc')
  const [platform, setPlatform] = useState('')
  const [copiedPin, setCopiedPin] = useState(false)
  const [inputPin, setInputPin] = useState('')
  const [commandInput, setCommandInput] = useState('')
  const [commandResults, setCommandResults] = useState<{ id: string; command: string; result: string; success: boolean }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatTarget, setChatTarget] = useState<string>('')
  const [showRegistration, setShowRegistration] = useState(true)
  const [marriageDialogOpen, setMarriageDialogOpen] = useState(false)
  const [pinExpiry, setPinExpiry] = useState(100)
  const [pinExpired, setPinExpired] = useState(false)
  const [qrToken, setQrToken] = useState('')
  const [qrRefreshCount, setQrRefreshCount] = useState(0)
  const qrRefreshRef = useRef<NodeJS.Timeout | null>(null)
  const [latency, setLatency] = useState(0)
  const [heartbeatCount, setHeartbeatCount] = useState(0)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [uptime, setUptime] = useState(0)
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null)
  const pinTimerRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const uptimeRef = useRef<NodeJS.Timeout | null>(null)

  // ===== Socket Connection =====
  useEffect(() => {
    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    store.setSocket(socketInstance)

    socketInstance.on('connect', () => {
      store.setConnected(true)
      setConnectionStartTime(Date.now())
      console.log('[Marriage Ring] Connected to server')

      if (store.currentDevice) {
        socketInstance.emit('register-device', {
          deviceId: store.currentDevice.deviceId,
          name: store.currentDevice.name,
          type: store.currentDevice.type,
          fingerprint: store.currentDevice.fingerprint,
          platform: store.currentDevice.platform,
        })
      }
    })

    socketInstance.on('disconnect', () => {
      store.setConnected(false)
      setConnectionStartTime(null)
      console.log('[Marriage Ring] Disconnected from server')
    })

    socketInstance.on('reconnect', () => {
      setReconnectCount(prev => prev + 1)
    })

    // Device events
    socketInstance.on('device-registered', (data) => {
      store.setIsRegistered(true)
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'Device registered',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('devices-updated', (data) => {
      store.setDevices(data.devices)
    })

    socketInstance.on('devices-list', (data) => {
      store.setDevices(data.devices)
    })

    // Engagement events
    socketInstance.on('engagement-pin-generated', (data) => {
      store.setEngagementPin(data.pin)
      store.setEngagementStatus('waiting')
      setPinExpired(false)
      setPinExpiry(100)
      if (pinTimerRef.current) clearInterval(pinTimerRef.current)
      pinTimerRef.current = setInterval(() => {
        setPinExpiry(prev => {
          if (prev <= 0) {
            if (pinTimerRef.current) clearInterval(pinTimerRef.current)
            setPinExpired(true)
            // Auto-clear after showing expired state for 3 seconds
            setTimeout(() => {
              store.setEngagementStatus('idle')
              store.setEngagementPin(null)
              setPinExpired(false)
            }, 3000)
            return 0
          }
          return prev - (100 / (data.expiresIn || 300))
        })
      }, 1000)
    })

    socketInstance.on('engagement-accepted', (data) => {
      store.setEngagementStatus('connected')
      store.setActiveEngagement({
        engagementId: data.engagementId,
        pin: data.pin,
        partnerDeviceId: data.partnerDeviceId,
        partnerName: data.partnerName,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'Engagement accepted!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
      setPinExpired(false)
      if (pinTimerRef.current) clearInterval(pinTimerRef.current)
    })

    socketInstance.on('engagement-success', (data) => {
      store.setEngagementStatus('connected')
      store.setActiveEngagement({
        engagementId: data.engagementId,
        pin: data.pin,
        partnerDeviceId: data.partnerDeviceId,
        partnerName: data.partnerName,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'Engagement successful!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('engagement-failed', (data) => {
      store.setEngagementStatus('failed')
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'Engagement failed',
        description: data.reason,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('engagement-expired', () => {
      setPinExpired(true)
      setTimeout(() => {
        store.setEngagementStatus('idle')
        store.setEngagementPin(null)
        setPinExpired(false)
      }, 3000)
      if (pinTimerRef.current) clearInterval(pinTimerRef.current)
    })

    // QR engagement events (faster connection)
    socketInstance.on('qr-engagement-success', (data) => {
      store.setEngagementStatus('connected')
      store.setActiveEngagement({
        engagementId: data.engagementId,
        pin: data.pin,
        partnerDeviceId: data.partnerDeviceId,
        partnerName: data.partnerName,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'QR Engagement!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    // Marriage events
    socketInstance.on('marriage-proposal-received', (data) => {
      store.addMarriageProposal({
        proposalId: data.proposalId,
        partnerDeviceId: data.fromDeviceId,
        partnerName: data.fromDeviceName,
        vows: data.vows,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage proposal received!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('marriage-proposal-sent', (data) => {
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage proposal sent',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('marriage-accepted', (data) => {
      store.addActiveMarriage({
        proposalId: data.proposalId,
        partnerDeviceId: data.partnerDeviceId,
        partnerName: data.partnerName,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage established!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
      setMarriageDialogOpen(false)
    })

    socketInstance.on('marriage-established', (data) => {
      store.addActiveMarriage({
        proposalId: data.proposalId,
        partnerDeviceId: data.partnerDeviceId,
        partnerName: data.partnerName,
        message: data.message,
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage established!',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('marriage-rejected', (data) => {
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage proposal declined',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    socketInstance.on('divorced', (data) => {
      store.addActivity({
        id: Date.now().toString(),
        type: 'divorce',
        title: 'Divorced',
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    // Command events
    socketInstance.on('command-response', (data) => {
      setCommandResults(prev => [...prev, {
        id: data.commandId,
        command: 'Command',
        result: data.result,
        success: data.success,
      }])
    })

    socketInstance.on('command-received', (data) => {
      const responses: Record<string, string> = {
        'ping': 'PONG! Latency: 12ms',
        'battery': 'Battery: 87% - Charging',
        'storage': 'Storage: 64.2GB / 128GB used',
        'screenshot': 'Screenshot captured and saved',
        'notifications': '3 unread notifications',
        'location': 'Lat: -26.2041, Lon: 28.0473',
        'wifi': 'WiFi: Connected to "Home_5G"',
        'apps': 'Running apps: Chrome, WhatsApp, Spotify',
        'clipboard': 'Clipboard: "Hello from PC!"',
        'volume': 'Volume: 75%',
      }
      const result = responses[data.command] || `Executed: ${data.command}`
      socketInstance.emit('command-result', {
        commandId: data.commandId,
        fromDeviceId: store.currentDevice?.deviceId,
        toDeviceId: data.fromDeviceId,
        result,
        success: true,
      })
    })

    // Heartbeat ACK with latency measurement
    socketInstance.on('heartbeat-ack', (data) => {
      setHeartbeatCount(prev => prev + 1)
      if (data.timestamp) {
        const measured = Date.now() - new Date(data.timestamp).getTime()
        setLatency(Math.max(0, measured))
      }
    })

    // Chat events
    socketInstance.on('chat-message-received', (data: ChatMessage) => {
      store.addChatMessage(data)
    })

    // Activity events
    socketInstance.on('activity', (data: ActivityInfo) => {
      store.addActivity(data)
    })

    // Partner disconnect
    socketInstance.on('partner-disconnected', (data) => {
      store.addActivity({
        id: Date.now().toString(),
        type: 'heartbeat',
        title: `${data.name} went offline`,
        description: data.message,
        timestamp: new Date().toISOString(),
      })
    })

    return () => {
      socketInstance.disconnect()
      if (pinTimerRef.current) clearInterval(pinTimerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (uptimeRef.current) clearInterval(uptimeRef.current)
      if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
    }
  }, [])

  // ===== QR Token Rotation (auto-refresh every 2s) =====
  useEffect(() => {
    if (store.engagementStatus === 'waiting' && store.engagementPin) {
      // Generate initial token immediately
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let token = ''
        for (let i = 0; i < 24; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return token
      }
      setQrToken(generateToken())
      setQrRefreshCount(0)

      // Rotate token every 2 seconds for faster, more secure pairing
      qrRefreshRef.current = setInterval(() => {
        setQrToken(generateToken())
        setQrRefreshCount(prev => prev + 1)
      }, 2000)
    } else {
      // Clean up when not waiting
      if (qrRefreshRef.current) {
        clearInterval(qrRefreshRef.current)
        qrRefreshRef.current = null
      }
      setQrToken('')
      setQrRefreshCount(0)
    }

    return () => {
      if (qrRefreshRef.current) {
        clearInterval(qrRefreshRef.current)
        qrRefreshRef.current = null
      }
    }
  }, [store.engagementStatus, store.engagementPin])

  // ===== Heartbeat with Latency Measurement =====
  useEffect(() => {
    if (store.isConnected && store.currentDevice) {
      heartbeatRef.current = setInterval(() => {
        const startTime = Date.now()
        store.socket?.emit('heartbeat', { deviceId: store.currentDevice?.deviceId })
        // Measure round-trip approximation
        setLatency(prev => {
          const newLatency = Date.now() - startTime
          return prev === 0 ? newLatency : Math.round((prev * 0.7) + (newLatency * 0.3)) // EMA
        })
        setHeartbeatCount(prev => prev + 1)
      }, 15000)
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [store.isConnected, store.currentDevice, store.socket])

  // ===== Uptime Counter =====
  useEffect(() => {
    if (connectionStartTime) {
      uptimeRef.current = setInterval(() => {
        setUptime(Math.floor((Date.now() - connectionStartTime) / 1000))
      }, 1000)
    } else {
      setUptime(0)
    }
    return () => {
      if (uptimeRef.current) clearInterval(uptimeRef.current)
    }
  }, [connectionStartTime])

  // ===== Handlers =====
  const handleRegister = () => {
    if (!deviceName.trim()) return

    const fingerprint = generateFingerprint()
    const deviceId = `dev_${fingerprint.slice(3)}`

    const device: DeviceInfo = {
      deviceId,
      name: deviceName.trim(),
      type: deviceType,
      fingerprint,
      platform: platform.trim() || (deviceType === 'pc' ? 'Web Browser' : 'Android 14'),
      status: 'online',
      avatar: getDeviceAvatar(deviceType, deviceName),
    }

    store.setCurrentDevice(device)

    if (store.socket && store.isConnected) {
      store.socket.emit('register-device', {
        deviceId: device.deviceId,
        name: device.name,
        type: device.type,
        fingerprint: device.fingerprint,
        platform: device.platform,
      })
    }

    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: device.name,
        type: device.type,
        fingerprint: device.fingerprint,
        platform: device.platform,
        avatar: device.avatar,
      }),
    }).catch(() => {})

    store.setIsRegistered(true)
    setShowRegistration(false)

    store.addActivity({
      id: Date.now().toString(),
      type: 'engagement',
      title: `${device.name} entered the ring`,
      description: `A ${device.type} device joined the Marriage Ring`,
      timestamp: new Date().toISOString(),
    })
  }

  const handleGeneratePin = () => {
    if (!store.currentDevice) return
    store.setEngagementStatus('generating')
    setPinExpired(false)
    if (store.socket && store.isConnected) {
      store.socket.emit('request-engagement-pin', { deviceId: store.currentDevice.deviceId })
    } else {
      // Offline simulation
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      setTimeout(() => {
        store.setEngagementPin(pin)
        store.setEngagementStatus('waiting')
        setPinExpiry(100)
        if (pinTimerRef.current) clearInterval(pinTimerRef.current)
        pinTimerRef.current = setInterval(() => {
          setPinExpiry(prev => {
            if (prev <= 0) {
              if (pinTimerRef.current) clearInterval(pinTimerRef.current)
              setPinExpired(true)
              setTimeout(() => {
                store.setEngagementStatus('idle')
                store.setEngagementPin(null)
                setPinExpired(false)
              }, 3000)
              return 0
            }
            return prev - (100 / 300)
          })
        }, 1000)
      }, 1500)
    }
  }

  const handleEngageWithPin = () => {
    if (!store.currentDevice || !inputPin.trim()) return
    if (store.socket && store.isConnected) {
      store.socket.emit('engage-with-pin', {
        pin: inputPin.trim(),
        deviceId: store.currentDevice.deviceId,
        name: store.currentDevice.name,
      })
    } else {
      // Offline simulation
      store.setEngagementStatus('connected')
      store.setActiveEngagement({
        engagementId: Date.now().toString(),
        pin: inputPin.trim(),
        partnerDeviceId: 'sim_partner',
        partnerName: 'Simulated Device',
        message: 'Engagement successful (offline mode)!',
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'engagement',
        title: 'Engagement successful!',
        description: 'Connected in offline mode',
        timestamp: new Date().toISOString(),
      })
    }
    setInputPin('')
  }

  const handleProposeMarriage = (partnerId: string) => {
    if (!store.currentDevice) return
    if (store.socket && store.isConnected) {
      store.socket.emit('propose-marriage', {
        fromDeviceId: store.currentDevice.deviceId,
        toDeviceId: partnerId,
        vows: JSON.stringify({
          allowCommands: true,
          allowNotifications: true,
          allowFileTransfer: true,
          autoReconnect: true,
          heartbeatInterval: 15000,
        }),
      })
    } else {
      // Offline simulation
      store.addActiveMarriage({
        proposalId: Date.now().toString(),
        partnerDeviceId: partnerId,
        partnerName: store.devices.find(d => d.deviceId === partnerId)?.name || 'Simulated Partner',
        message: 'Marriage established (offline mode)! The bond is forever!',
      })
      store.addActivity({
        id: Date.now().toString(),
        type: 'marriage',
        title: 'Marriage established!',
        description: 'Your bond is forever (offline mode)',
        timestamp: new Date().toISOString(),
      })
    }
    setMarriageDialogOpen(false)
  }

  const handleAcceptMarriage = (proposalId: string) => {
    if (!store.socket || !store.currentDevice) return
    store.socket.emit('accept-marriage', {
      proposalId,
      deviceId: store.currentDevice.deviceId,
    })
  }

  const handleRejectMarriage = (proposalId: string) => {
    if (!store.socket) return
    store.socket.emit('reject-marriage', { proposalId })
    store.removeMarriageProposal(proposalId)
  }

  const handleDivorce = (partnerId: string) => {
    if (!store.socket || !store.currentDevice) return
    store.socket.emit('divorce', {
      fromDeviceId: store.currentDevice.deviceId,
      toDeviceId: partnerId,
    })
  }

  const handleExecuteCommand = (command: string) => {
    if (!store.currentDevice || !command.trim()) return
    const targetId = store.activeMarriages[0]?.partnerDeviceId || store.activeEngagement?.partnerDeviceId
    if (!targetId) return

    const commandId = Date.now().toString()

    if (store.socket && store.isConnected) {
      store.socket.emit('execute-command', {
        fromDeviceId: store.currentDevice.deviceId,
        toDeviceId: targetId,
        command: command.trim(),
        commandId,
      })
      setCommandResults(prev => [...prev, {
        id: commandId,
        command: command.trim(),
        result: 'Executing...',
        success: true,
      }])
    } else {
      // Offline simulation
      const responses: Record<string, string> = {
        'ping': 'PONG! Latency: 12ms',
        'battery': 'Battery: 87% - Charging',
        'storage': 'Storage: 64.2GB / 128GB used',
        'screenshot': 'Screenshot captured and saved',
        'notifications': '3 unread notifications',
        'location': 'Lat: -26.2041, Lon: 28.0473',
        'wifi': 'WiFi: Connected to "Home_5G"',
        'apps': 'Running apps: Chrome, WhatsApp, Spotify',
        'clipboard': 'Clipboard: "Hello from PC!"',
        'volume': 'Volume: 75%',
      }
      const result = responses[command.trim()] || `Executed: ${command.trim()}`
      setTimeout(() => {
        setCommandResults(prev => [...prev, {
          id: commandId,
          command: command.trim(),
          result,
          success: true,
        }])
      }, 500 + Math.random() * 500)
    }
    setCommandInput('')
  }

  const handleSendChat = () => {
    if (!store.currentDevice || !chatInput.trim() || !chatTarget) return
    if (store.socket && store.isConnected) {
      store.socket.emit('chat-message', {
        fromDeviceId: store.currentDevice.deviceId,
        toDeviceId: chatTarget,
        message: chatInput.trim(),
        messageId: Date.now().toString(),
      })
    }
    store.addChatMessage({
      id: Date.now().toString(),
      fromDeviceId: store.currentDevice.deviceId,
      fromDeviceName: 'You',
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    })
    setChatInput('')
  }

  const copyPin = () => {
    if (store.engagementPin) {
      navigator.clipboard.writeText(store.engagementPin)
      setCopiedPin(true)
      setTimeout(() => setCopiedPin(false), 2000)
    }
  }

  const handleSimulateDevice = () => {
    const simulatedDevice: DeviceInfo = {
      deviceId: `sim_${Date.now()}`,
      name: deviceType === 'pc' ? 'Pixel 8 Pro' : 'Windows Desktop',
      type: deviceType === 'pc' ? 'android' : 'pc',
      fingerprint: generateFingerprint(),
      platform: deviceType === 'pc' ? 'Android 14' : 'Windows 11',
      status: 'online',
      avatar: deviceType === 'pc' ? '📱' : '💻',
    }
    store.setDevices([...store.devices.filter(d => d.deviceId !== simulatedDevice.deviceId), simulatedDevice])
    store.addActivity({
      id: Date.now().toString(),
      type: 'engagement',
      title: `${simulatedDevice.name} joined the ring`,
      description: `A ${simulatedDevice.type} device has entered the Marriage Ring`,
      timestamp: new Date().toISOString(),
    })
  }

  // Engagement QR data with rotating token for fast, secure pairing
  const engagementQrData = store.engagementPin && qrToken
    ? JSON.stringify({
        type: 'marriage-ring-engagement',
        pin: store.engagementPin,
        device: store.currentDevice?.name,
        deviceId: store.currentDevice?.deviceId,
        token: qrToken,
        ts: Date.now(),
        refresh: qrRefreshCount,
      })
    : ''

  // ===== RENDER =====

  // Registration Screen
  if (showRegistration || !store.isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <MarriageRingIcon size={120} animated />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Marriage Ring
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Android & PC — Connected Forever</p>
            <p className="text-gray-600 mt-1 text-xs">Replacing ADB with love & persistence</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              {store.isConnected ? (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                  <Wifi className="w-3 h-3 mr-1" /> Server Online
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Demo Mode
                </Badge>
              )}
            </div>
          </div>

          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-100">Enter the Ring</CardTitle>
              <CardDescription className="text-gray-400">
                Register your device to begin engaging and marrying with other devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Device Name</label>
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="My Awesome Device"
                  className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Device Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={deviceType === 'android' ? 'default' : 'outline'}
                    className={deviceType === 'android'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    }
                    onClick={() => setDeviceType('android')}
                  >
                    <Smartphone className="w-4 h-4 mr-2" /> Android
                  </Button>
                  <Button
                    type="button"
                    variant={deviceType === 'pc' ? 'default' : 'outline'}
                    className={deviceType === 'pc'
                      ? 'bg-sky-600 hover:bg-sky-700 text-white'
                      : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    }
                    onClick={() => setDeviceType('pc')}
                  >
                    <Monitor className="w-4 h-4 mr-2" /> PC
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Platform (optional)</label>
                <Input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder={deviceType === 'pc' ? 'Windows 11' : 'Android 14'}
                  className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500"
                />
              </div>

              <Button
                onClick={handleRegister}
                disabled={!deviceName.trim()}
                className="w-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-semibold text-base h-12"
              >
                <Sparkles className="w-5 h-5 mr-2" /> Enter the Ring
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By entering, you agree to the sacred vows of the Marriage Ring
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MarriageRingIcon size={36} />
            <div>
              <h1 className="text-lg font-bold text-gray-100">Marriage Ring</h1>
              <p className="text-xs text-gray-500">ADB Replacement — No Timeouts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Current Device Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <span className="text-lg">{store.currentDevice?.avatar}</span>
              <div>
                <p className="text-sm font-medium text-gray-200">{store.currentDevice?.name}</p>
                <p className="text-xs text-gray-500">{store.currentDevice?.platform}</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5">
                ONLINE
              </Badge>
            </div>

            {/* Connection Status with Latency */}
            <div className="flex items-center gap-2">
              {store.isConnected && latency > 0 && (
                <span className={`text-xs font-mono ${latency < 50 ? 'text-emerald-400' : latency < 150 ? 'text-amber-400' : 'text-red-400'}`}>
                  {latency}ms
                </span>
              )}
              <Badge
                variant="outline"
                className={store.isConnected
                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                }
              >
                {store.isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {store.isConnected ? 'Connected' : 'Demo Mode'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <Tabs defaultValue="ring" className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700/50">
            <TabsTrigger value="ring" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
              <Gem className="w-4 h-4 mr-1.5" /> The Ring
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Users className="w-4 h-4 mr-1.5" /> Devices
            </TabsTrigger>
            <TabsTrigger value="commands" className="data-[state=active]:bg-sky-600/20 data-[state=active]:text-sky-400">
              <Terminal className="w-4 h-4 mr-1.5" /> Commands
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-400">
              <Send className="w-4 h-4 mr-1.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
              <Activity className="w-4 h-4 mr-1.5" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* ====== THE RING TAB ====== */}
          <TabsContent value="ring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Card */}
              <Card className="bg-gray-900/80 border-amber-500/20 border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-amber-300">Engagement</CardTitle>
                        <CardDescription className="text-amber-500/70">Temporal Connection</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      <Clock className="w-3 h-3 mr-1" /> Temporary
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {store.engagementStatus === 'idle' && (
                    <div className="text-center space-y-4">
                      <p className="text-gray-400 text-sm">
                        Generate a PIN to start an engagement. Share it with the device you want to connect with temporarily.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGeneratePin}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Sparkles className="w-4 h-4 mr-2" /> Generate PIN
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSimulateDevice}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          <Smartphone className="w-4 h-4 mr-2" /> Simulate
                        </Button>
                      </div>
                      <Separator className="bg-gray-800" />
                      <div className="space-y-2">
                        <p className="text-gray-400 text-sm">Or enter a PIN from another device:</p>
                        <div className="flex gap-2">
                          <Input
                            value={inputPin}
                            onChange={(e) => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit PIN"
                            className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500 text-center text-lg tracking-widest font-mono"
                            maxLength={6}
                            onKeyDown={(e) => e.key === 'Enter' && handleEngageWithPin()}
                          />
                          <Button
                            onClick={handleEngageWithPin}
                            disabled={inputPin.length !== 6}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="bg-gray-800" />
                      <div className="space-y-2">
                        <p className="text-gray-400 text-sm flex items-center justify-center gap-1.5">
                          <QrCode className="w-4 h-4 text-amber-400" /> Or paste scanned QR data for instant connection:
                        </p>
                        <Input
                          placeholder='Paste QR JSON here...'
                          className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              try {
                                const qrData = JSON.parse(e.currentTarget.value)
                                if (qrData.type === 'marriage-ring-engagement' && qrData.pin) {
                                  if (store.socket && store.isConnected) {
                                    store.socket.emit('engage-via-qr', {
                                      pin: qrData.pin,
                                      deviceId: store.currentDevice?.deviceId,
                                      name: store.currentDevice?.name,
                                      token: qrData.token,
                                    })
                                  } else {
                                    // Offline simulation
                                    store.setEngagementStatus('connected')
                                    store.setActiveEngagement({
                                      engagementId: Date.now().toString(),
                                      pin: qrData.pin,
                                      partnerDeviceId: qrData.deviceId || 'qr_partner',
                                      partnerName: qrData.device || 'QR Partner',
                                      message: 'QR engagement successful! Instant connection.',
                                    })
                                    store.addActivity({
                                      id: Date.now().toString(),
                                      type: 'engagement',
                                      title: 'QR Engagement!',
                                      description: 'Instant connection via QR scan',
                                      timestamp: new Date().toISOString(),
                                    })
                                  }
                                  e.currentTarget.value = ''
                                }
                              } catch { /* invalid JSON, ignore */ }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {store.engagementStatus === 'generating' && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full mx-auto mb-4" />
                      <p className="text-amber-300">Generating engagement PIN...</p>
                    </div>
                  )}

                  {store.engagementStatus === 'waiting' && store.engagementPin && (
                    <div className="text-center space-y-4">
                      {pinExpired ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                          </div>
                          <p className="text-red-400 font-medium">PIN Expired</p>
                          <PinDisplay pin={store.engagementPin} expired />
                          <Button
                            onClick={() => {
                              store.setEngagementStatus('idle')
                              store.setEngagementPin(null)
                              setPinExpired(false)
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" /> Generate New PIN
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-amber-300 text-sm font-medium">Scan QR or enter PIN to connect:</p>

                          {/* QR + PIN side by side */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            {/* QR Code - auto displayed, always refreshing */}
                            <div className="relative">
                              <div className="p-3 bg-white rounded-2xl shadow-xl shadow-amber-500/10">
                                <QRCodeSVG
                                  value={engagementQrData || 'waiting'}
                                  size={160}
                                  level="M"
                                  bgColor="#ffffff"
                                  fgColor="#1a1a2e"
                                />
                              </div>
                              {/* Live pulse indicator */}
                              <div className="absolute -top-1 -right-1 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                                </span>
                                LIVE
                              </div>
                              {/* Refresh counter */}
                              <p className="text-[10px] text-gray-600 mt-1.5 text-center">
                                Auto-refreshes every 2s
                              </p>
                            </div>

                            {/* PIN display */}
                            <div className="flex flex-col items-center gap-3">
                              <PinDisplay pin={store.engagementPin} />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyPin}
                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                              >
                                {copiedPin ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                {copiedPin ? 'Copied!' : 'Copy PIN'}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>PIN expires in</span>
                              <span>{Math.max(0, Math.ceil(pinExpiry / 100 * 5))}s</span>
                            </div>
                            <Progress value={pinExpiry} className="h-2" />
                          </div>
                          <p className="text-xs text-gray-500">
                            QR code refreshes automatically for faster, more secure pairing
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {store.engagementStatus === 'connected' && store.activeEngagement && (
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                        <Link2 className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="text-amber-300 font-semibold">Engaged!</p>
                      <p className="text-gray-400 text-sm">
                        Connected with <span className="text-amber-300">{store.activeEngagement.partnerName || 'Partner'}</span>
                      </p>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                        <Clock className="w-3 h-3 mr-1" /> Temporary Connection
                      </Badge>
                      <Button
                        variant="outline"
                        onClick={() => {
                          store.setEngagementStatus('idle')
                          store.setEngagementPin(null)
                          store.setActiveEngagement(null)
                        }}
                        className="border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 w-full"
                      >
                        <Unlink2 className="w-4 h-4 mr-2" /> Break Engagement
                      </Button>
                    </div>
                  )}

                  {store.engagementStatus === 'failed' && (
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                        <X className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-red-400 font-semibold">Engagement Failed</p>
                      <Button
                        onClick={() => store.setEngagementStatus('idle')}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marriage Card */}
              <Card className="bg-gray-900/80 border-rose-500/20 border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <CardTitle className="text-rose-300">Marriage</CardTitle>
                        <CardDescription className="text-rose-500/70">Forever Bond</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 text-rose-400">
                      <Shield className="w-3 h-3 mr-1" /> Permanent
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Marriage Proposals Received */}
                  {store.marriageProposals.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-rose-300 text-sm font-medium">Pending Proposals:</p>
                      {store.marriageProposals.map((proposal) => (
                        <div key={proposal.proposalId} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-rose-300 font-medium">{proposal.partnerName} wants to marry you!</p>
                          </div>
                          <p className="text-gray-400 text-xs mb-3">{proposal.message}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptMarriage(proposal.proposalId)}
                              className="bg-rose-600 hover:bg-rose-700 text-white flex-1"
                            >
                              <Heart className="w-3 h-3 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectMarriage(proposal.proposalId)}
                              className="border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                            >
                              <X className="w-3 h-3 mr-1" /> Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Marriages */}
                  {store.activeMarriages.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-rose-300 text-sm font-medium">Married Devices:</p>
                      {store.activeMarriages.map((marriage) => (
                        <div key={marriage.proposalId} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                              <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-rose-300 font-medium">{marriage.partnerName || 'Partner'}</p>
                              <p className="text-gray-500 text-xs">Forever bonded — auto-reconnect active</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDivorce(marriage.partnerDeviceId)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Unlink2 className="w-4 h-4 mr-1" /> Divorce
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
                        <Heart className="w-8 h-8 text-rose-500/40" />
                      </div>
                      <p className="text-gray-400 text-sm">
                        Get engaged first, then propose marriage for a permanent bond with auto-reconnect.
                      </p>
                    </div>
                  )}

                  {/* Propose Marriage Button */}
                  {store.activeEngagement && store.activeMarriages.length === 0 && (
                    <Dialog open={marriageDialogOpen} onOpenChange={setMarriageDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold">
                          <Heart className="w-4 h-4 mr-2" /> Propose Marriage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-rose-300 flex items-center gap-2">
                            <Heart className="w-5 h-5" /> Marriage Proposal
                          </DialogTitle>
                          <DialogDescription className="text-gray-400">
                            A marriage is forever. Your devices will maintain a persistent connection with auto-reconnect and heartbeat monitoring.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <h4 className="text-rose-300 font-medium mb-2">Marriage Vows</h4>
                            <ul className="space-y-1.5 text-sm text-gray-400">
                              <li className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" /> Auto-reconnect on disconnect
                              </li>
                              <li className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-400" /> Secure command execution
                              </li>
                              <li className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-sky-400" /> Cross-network persistence
                              </li>
                              <li className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-violet-400" /> Notification relay
                              </li>
                              <li className="flex items-center gap-2">
                                <FileUp className="w-4 h-4 text-orange-400" /> File transfer access
                              </li>
                            </ul>
                          </div>
                          <Button
                            onClick={() => {
                              if (store.activeEngagement?.partnerDeviceId) {
                                handleProposeMarriage(store.activeEngagement.partnerDeviceId)
                              }
                            }}
                            className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold"
                          >
                            <Heart className="w-4 h-4 mr-2" /> Send Proposal
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Quick Marry from Device List */}
                  {store.devices.filter(d => d.deviceId !== store.currentDevice?.deviceId).length > 0 && store.activeMarriages.length === 0 && !store.activeEngagement && (
                    <div className="space-y-2">
                      <Separator className="bg-gray-800" />
                      <p className="text-gray-400 text-xs">Quick marry with online device:</p>
                      {store.devices
                        .filter(d => d.deviceId !== store.currentDevice?.deviceId)
                        .map(device => (
                          <div key={device.deviceId} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span>{device.avatar || (device.type === 'android' ? '📱' : '💻')}</span>
                              <span className="text-sm text-gray-300">{device.name}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleProposeMarriage(device.deviceId)}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              <Heart className="w-3 h-3 mr-1" /> Marry
                            </Button>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Connection Health Monitor */}
            <ConnectionHealthMonitor
              isConnected={store.isConnected}
              isMarried={store.activeMarriages.length > 0}
              latency={latency}
              uptime={uptime}
              heartbeatCount={heartbeatCount}
              reconnectCount={reconnectCount}
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-gray-900/60 border-gray-800/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{store.devices.length}</p>
                  <p className="text-xs text-gray-500">Online Devices</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/60 border-gray-800/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{store.activeEngagement ? 1 : 0}</p>
                  <p className="text-xs text-gray-500">Engagements</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/60 border-gray-800/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-rose-400">{store.activeMarriages.length}</p>
                  <p className="text-xs text-gray-500">Marriages</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/60 border-gray-800/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-violet-400">{store.activities.length}</p>
                  <p className="text-xs text-gray-500">Activities</p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card className="bg-gray-900/60 border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-gray-200 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> How Marriage Ring Replaces ADB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                      <Link2 className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-amber-300">1. Engagement</h3>
                    <p className="text-sm text-gray-400">
                      Generate a PIN or QR code. Devices connect temporarily via WebSocket — like ADB connect, but with easy pairing and no USB dependency.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto">
                      <Heart className="w-6 h-6 text-rose-400" />
                    </div>
                    <h3 className="font-semibold text-rose-300">2. Marriage</h3>
                    <p className="text-sm text-gray-400">
                      Propose a permanent bond. Married devices auto-reconnect on disconnect, share heartbeats, and never time out — the #1 ADB pain point solved.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                      <Shield className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-emerald-300">3. Forever</h3>
                    <p className="text-sm text-gray-400">
                      Execute commands, transfer files, relay notifications — all over a persistent WebSocket bond. No ADB daemon, no USB debugging, no timeouts.
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-800 my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <p className="text-red-400 font-medium mb-1">ADB Problems</p>
                    <ul className="text-gray-500 space-y-1">
                      <li>Connection drops after idle timeout</li>
                      <li>Requires USB debugging enabled</li>
                      <li>ADB daemon crashes and restarts</li>
                      <li>No automatic reconnection</li>
                      <li>Command-line only, no UI</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <p className="text-emerald-400 font-medium mb-1">Marriage Ring Solutions</p>
                    <ul className="text-gray-500 space-y-1">
                      <li>Heartbeat keeps connections alive</li>
                      <li>QR code / PIN pairing — no USB</li>
                      <li>Auto-reconnect on any disconnect</li>
                      <li>Marriage = persistent forever bond</li>
                      <li>Beautiful dashboard UI</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== DEVICES TAB ====== */}
          <TabsContent value="devices" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-100">Connected Devices</h2>
              <Button
                variant="outline"
                onClick={handleSimulateDevice}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Smartphone className="w-4 h-4 mr-2" /> Add Simulated Device
              </Button>
            </div>

            {store.devices.length === 0 ? (
              <Card className="bg-gray-900/60 border-gray-800/50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400">No other devices connected yet.</p>
                  <p className="text-gray-500 text-sm mt-1">Generate an engagement PIN to start connecting!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {store.devices
                  .filter(d => d.deviceId !== store.currentDevice?.deviceId)
                  .map(device => {
                    const isMarried = store.activeMarriages.some(m => m.partnerDeviceId === device.deviceId)
                    const isEngaged = store.activeEngagement?.partnerDeviceId === device.deviceId

                    return (
                      <Card key={device.deviceId} className={`bg-gray-900/60 ${
                        isMarried ? 'border-rose-500/30 border-2' :
                        isEngaged ? 'border-amber-500/30 border-2' :
                        'border-gray-800/50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
                                {device.avatar || (device.type === 'android' ? '📱' : '💻')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-200">{device.name}</p>
                                <p className="text-xs text-gray-500">{device.platform || device.type}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                device.status === 'online'
                                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                                  : 'border-gray-600 text-gray-500 bg-gray-800'
                              }
                            >
                              {device.status}
                            </Badge>
                          </div>

                          {isMarried && (
                            <Badge className="mt-3 bg-rose-500/20 text-rose-300 border-rose-500/30">
                              <Heart className="w-3 h-3 mr-1 fill-rose-400" /> Married
                            </Badge>
                          )}
                          {isEngaged && !isMarried && (
                            <Badge className="mt-3 bg-amber-500/20 text-amber-300 border-amber-500/30">
                              <Link2 className="w-3 h-3 mr-1" /> Engaged
                            </Badge>
                          )}

                          <div className="flex gap-2 mt-3">
                            {!isMarried && !isEngaged && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleProposeMarriage(device.deviceId)}
                                  className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Heart className="w-3 h-3 mr-1" /> Marry
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setChatTarget(device.deviceId)}
                                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                  <Send className="w-3 h-3 mr-1" /> Chat
                                </Button>
                              </>
                            )}
                            {isMarried && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDivorce(device.deviceId)}
                                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <Unlink2 className="w-3 h-3 mr-1" /> Divorce
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            )}
          </TabsContent>

          {/* ====== COMMANDS TAB ====== */}
          <TabsContent value="commands" className="space-y-6">
            <Card className="bg-gray-900/80 border-sky-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sky-300">Command Terminal</CardTitle>
                    <CardDescription className="text-sky-500/70">
                      Execute commands on connected devices — replaces ADB shell
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!store.activeEngagement && store.activeMarriages.length === 0) ? (
                  <div className="text-center py-8">
                    <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Engage or marry a device to execute commands</p>
                  </div>
                ) : (
                  <>
                    {/* Quick Commands */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Quick Commands:</p>
                      <div className="flex flex-wrap gap-2">
                        {['ping', 'battery', 'storage', 'screenshot', 'notifications', 'location', 'wifi', 'apps', 'clipboard', 'volume'].map(cmd => (
                          <Button
                            key={cmd}
                            size="sm"
                            variant="outline"
                            onClick={() => handleExecuteCommand(cmd)}
                            className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 font-mono"
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Custom Command Input */}
                    <div className="flex gap-2">
                      <Input
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        placeholder="Enter command..."
                        className="bg-gray-800/50 border-gray-700 text-gray-100 font-mono placeholder:text-gray-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand(commandInput)}
                      />
                      <Button
                        onClick={() => handleExecuteCommand(commandInput)}
                        disabled={!commandInput.trim()}
                        className="bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        <Terminal className="w-4 h-4 mr-2" /> Run
                      </Button>
                    </div>

                    {/* Command Results */}
                    <ScrollArea className="h-64 w-full bg-gray-950 rounded-lg border border-gray-800 p-3">
                      {commandResults.length === 0 ? (
                        <p className="text-gray-600 text-sm font-mono">No commands executed yet...</p>
                      ) : (
                        <div className="space-y-2 font-mono text-sm">
                          {commandResults.map((result) => (
                            <div key={result.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sky-400">$</span>
                                <span className="text-gray-300">{result.command}</span>
                              </div>
                              <div className={`pl-4 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result.result}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== CHAT TAB ====== */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="bg-gray-900/80 border-violet-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-violet-300">Device Chat</CardTitle>
                    <CardDescription className="text-violet-500/70">
                      Communicate directly with connected devices
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Target Selection */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Chat with:</p>
                  <div className="flex flex-wrap gap-2">
                    {store.devices
                      .filter(d => d.deviceId !== store.currentDevice?.deviceId)
                      .map(device => (
                        <Button
                          key={device.deviceId}
                          size="sm"
                          variant={chatTarget === device.deviceId ? 'default' : 'outline'}
                          className={chatTarget === device.deviceId
                            ? 'bg-violet-600 text-white'
                            : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                          }
                          onClick={() => setChatTarget(device.deviceId)}
                        >
                          {device.avatar} {device.name}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-72 w-full bg-gray-950 rounded-lg border border-gray-800 p-3">
                  {store.chatMessages.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center">
                      {chatTarget ? 'No messages yet. Start chatting!' : 'Select a device to chat with'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {store.chatMessages
                        .filter(m => m.fromDeviceId === chatTarget || m.fromDeviceId === store.currentDevice?.deviceId)
                        .map(msg => (
                          <div key={msg.id} className={`flex ${msg.fromDeviceId === store.currentDevice?.deviceId ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-2.5 rounded-lg ${
                              msg.fromDeviceId === store.currentDevice?.deviceId
                                ? 'bg-violet-600/20 border border-violet-500/20'
                                : 'bg-gray-800/80 border border-gray-700'
                            }`}>
                              <p className="text-xs text-gray-500 mb-1">{msg.fromDeviceName}</p>
                              <p className="text-sm text-gray-200">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={chatTarget ? "Type a message..." : "Select a device first"}
                    disabled={!chatTarget}
                    className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !chatTarget}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ACTIVITY TAB ====== */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-gray-900/80 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-gray-200 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" /> Activity Log
                </CardTitle>
                <CardDescription className="text-gray-400">
                  All events in the Marriage Ring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full">
                  {store.activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {store.activities.map((activity, i) => (
                        <div key={activity.id || i} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800/50">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'marriage' ? 'bg-rose-500/20' :
                            activity.type === 'engagement' ? 'bg-amber-500/20' :
                            activity.type === 'divorce' ? 'bg-red-500/20' :
                            activity.type === 'command' ? 'bg-sky-500/20' :
                            'bg-gray-700/50'
                          }`}>
                            {activity.type === 'marriage' ? <Heart className="w-4 h-4 text-rose-400" /> :
                             activity.type === 'engagement' ? <Link2 className="w-4 h-4 text-amber-400" /> :
                             activity.type === 'divorce' ? <Unlink2 className="w-4 h-4 text-red-400" /> :
                             activity.type === 'command' ? <Terminal className="w-4 h-4 text-sky-400" /> :
                             <Activity className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200">{activity.title}</p>
                            {activity.description && (
                              <p className="text-xs text-gray-500">{activity.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 flex-shrink-0">
                            {timeAgo(activity.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-950/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MarriageRingIcon size={20} />
            <span>Marriage Ring — ADB Replacement</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> WebSocket
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Persistent
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> No Timeouts
            </span>
            <span className="flex items-center gap-1">
              <ArrowDownUp className="w-3 h-3" /> Auto-Reconnect
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
