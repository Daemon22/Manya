'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useManya } from '@/lib/store'
import { AliveDot } from './chrome'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

interface PeerState {
  socketId: string
  name: string
  micOn: boolean
  camOn: boolean
}

const SIMULATED: PeerState[] = [
  { socketId: 'sim-1', name: 'Nalini K. (sim)', micOn: true, camOn: true },
  { socketId: 'sim-2', name: 'Ravi T. (sim)', micOn: false, camOn: true },
]

const SIM_LINES = [
  'Let me put a number on that before we move on.',
  'Agreed — but who carries this action item?',
  'Can we hold that thought for the Solid Point?',
  'I can have the figures by Friday.',
]

export function CallRoom() {
  const { data, activeRoom, go, refresh } = useManya()
  const room = activeRoom
  const me = data?.member?.name ?? 'You'

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [camError, setCamError] = useState('')
  const [peers, setPeers] = useState<PeerState[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [solidLines, setSolidLines] = useState<string[]>([''])
  const [solidTitle, setSolidTitle] = useState('')
  const [savingSolid, setSavingSolid] = useState(false)
  const [solidSaved, setSolidSaved] = useState(false)
  const [speakingSim, setSpeakingSim] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const roomId = room?.id ?? 'x'

  // ── local media ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const wantCam = room?.kind !== 'AUDIO'
    navigator.mediaDevices
      ?.getUserMedia({ audio: true, video: wantCam })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
      })
      .catch(() => {
        if (!cancelled) setCamError(wantCam
          ? 'Camera and microphone were not granted — you sit at the table as a silent tile. Others still see the seat is taken.'
          : 'Microphone was not granted — you are listening only.')
      })
    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }, [room?.kind])

  // ── signaling + mesh ───────────────────────────────────────────────────
  const buildPC = useCallback((remoteSocketId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pcsRef.current.set(remoteSocketId, pc)

    const stream = localStreamRef.current
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    else {
      // silent placeholder track so negotiation still completes
      pc.addTransceiver('audio', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('rtc:ice', { to: remoteSocketId, candidate: e.candidate })
    }
    pc.ontrack = (e) => {
      const el = document.querySelector<HTMLVideoElement>(`video[data-peer="${remoteSocketId}"]`)
      if (el && e.streams[0]) el.srcObject = e.streams[0]
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.restartIce?.()
    }

    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socketRef.current?.emit('rtc:offer', { to: remoteSocketId, sdp: pc.localDescription })
        } catch { /* negotiation raced; harmless */ }
      }
    }
    return pc
  }, [])

  useEffect(() => {
    if (!room) return

    const socket = io('/?XTransformPort=3003', { path: '/', transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('room:join', { roomId: room.id, name: me, micOn, camOn })
    })

    socket.on('room:peers', ({ peers: existing }: { peers: PeerState[] }) => {
      setPeers(existing)
      for (const p of existing) buildPC(p.socketId, true)
    })

    socket.on('peer:joined', ({ peer }: { peer: PeerState }) => {
      setPeers((prev) => (prev.some((x) => x.socketId === peer.socketId) ? prev : [...prev, peer]))
    })

    socket.on('peer:left', ({ socketId, name }: { socketId: string; name?: string }) => {
      pcsRef.current.get(socketId)?.close()
      pcsRef.current.delete(socketId)
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId))
      setChat((c) => [...c, { id: `sys-${Date.now()}`, author: 'Manya', body: `${name ?? 'A seat'} has left the table.`, ts: Date.now(), kind: 'system' }])
    })

    socket.on('peer:media', ({ socketId, micOn: m, camOn: c }: { socketId: string; micOn: boolean; camOn: boolean }) => {
      setPeers((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, micOn: m, camOn: c } : p)))
    })

    socket.on('rtc:offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      let pc = pcsRef.current.get(from)
      if (!pc) pc = buildPC(from, false)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socketRef.current?.emit('rtc:answer', { to: from, sdp: pc.localDescription })
      } catch { /* ignore malformed offers */ }
    })

    socket.on('rtc:answer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)) } catch { /* ignore */ }
    })

    socket.on('rtc:ice', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      pcsRef.current.get(from)?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    })

    socket.on('chat', (msg: ChatMessage) => setChat((c) => [...c.slice(-80), msg]))

    return () => {
      socket.emit('room:leave')
      socket.disconnect()
      pcsRef.current.forEach((pc) => pc.close())
      pcsRef.current.clear()
      socketRef.current = null
    }
    // join once per room mount; deps intentionally narrow to the room id
  }, [room?.id])

  // session timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // simulated seats breathe (local only — demo of the 3-seat minimum)
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.45) {
        const who = SIMULATED[Math.floor(Math.random() * SIMULATED.length)]
        setSpeakingSim(who.socketId)
        setChat((c) => [...c.slice(-80), { id: `sim-${Date.now()}`, author: who.name, body: SIM_LINES[Math.floor(Math.random() * SIM_LINES.length)], ts: Date.now(), kind: 'user' }])
        setTimeout(() => setSpeakingSim(null), 2600)
      }
    }, 9000)
    return () => clearInterval(t)
  }, [])

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
    socketRef.current?.emit('media:state', { micOn: next, camOn })
  }
  const toggleCam = () => {
    const next = !camOn
    setCamOn(next)
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
    socketRef.current?.emit('media:state', { micOn, camOn: next })
  }

  const sendChat = () => {
    if (!chatDraft.trim()) return
    socketRef.current?.emit('chat', { roomId, body: chatDraft.trim(), author: me })
    setChatDraft('')
  }

  const saveSolid = async () => {
    const points = solidLines.map((l) => l.trim()).filter(Boolean)
    if (points.length === 0 || !room) return
    setSavingSolid(true)
    try {
      const res = await fetch('/api/rooms/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, title: solidTitle || room.name, points, by: me }),
      })
      if (res.ok) {
        setSolidSaved(true)
        socketRef.current?.emit('solid:raised', { roomId, line: `Solid point recorded: ${points[0]}` })
        await refresh()
      }
    } finally {
      setSavingSolid(false)
    }
  }

  const mmss = useMemo(() => `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`, [elapsed])
  const seatCount = 1 + peers.length + SIMULATED.length

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">No table is pulled up.</p>
        <button onClick={() => go('conclave')} className="mny-btn rounded-full px-5 py-2 text-sm font-semibold">Back to the Conclave floor</button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background/90">
      {/* room header */}
      <header className="sticky top-0 z-30 border-b border-gold-600/15 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <AliveDot />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{room.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{room.topic}</p>
          </div>
          <span className="ml-3 hidden rounded-full border border-gold-600/20 px-2.5 py-1 text-[11px] text-muted-foreground sm:block">{mmss}</span>
          <span className="rounded-full border border-gold-600/20 px-2.5 py-1 text-[11px] text-muted-foreground">{seatCount} seats</span>
          <button
            onClick={() => go('conclave')}
            className="ml-auto rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs text-rose-700 transition hover:bg-rose-500/20"
          >
            Stand up & leave
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_300px]">
        {/* ── tiles ── */}
        <section>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* self */}
            <Tile name={`${me} (you)`} micOn={micOn} camOn={camOn && !camError} speaking={false} kind={room.kind}>
              {camOn && !camError
                ? <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                : <SilentTile label={camError ? 'no camera' : 'camera off'} />}
            </Tile>

            {/* remote peers */}
            {peers.map((p) => (
              <Tile key={p.socketId} name={p.name} micOn={p.micOn} camOn={p.camOn} speaking={false} kind={room.kind}>
                {p.camOn
                  ? <video data-peer={p.socketId} autoPlay playsInline className="h-full w-full object-cover" />
                  : <SilentTile label="camera off" />}
              </Tile>
            ))}

            {/* simulated seats — Conclaves are built for three or more */}
            {SIMULATED.map((s) => (
              <Tile key={s.socketId} name={s.name} micOn={s.micOn} camOn={s.camOn && speakingSim === s.socketId} speaking={speakingSim === s.socketId} kind={room.kind} simulated>
                {speakingSim === s.socketId
                  ? <div className="h-full w-full bg-gradient-to-br from-champagne-500/30 via-sapphire-500/20 to-gold-500/30" />
                  : <SilentTile label="simulated seat" />}
              </Tile>
            ))}

            {/* an empty chair to be filled */}
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-gold-600/30 bg-white/40">
              <div className="text-center">
                <p className="text-2xl text-gold-600/40">＋</p>
                <p className="mt-1 text-[11px] text-muted-foreground">an empty chair — invite via Connect</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Two seats here are simulated so the shape of the room is honest — Conclaves are designed for three or more.
            Your own camera and microphone, and any second tab or colleague, join for real over the signaling web.
          </p>
        </section>

        {/* ── side rail: chat + solid point ── */}
        <aside className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
          <div className="mny-glass flex min-h-0 flex-1 flex-col rounded-2xl p-3.5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium"><AliveDot className="scale-90" /> table talk</h2>
            <div className="mny-scroll mb-2 max-h-64 flex-1 space-y-2 overflow-y-auto lg:max-h-none">
              {chat.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">The table is quiet. Say the first thing.</p>}
              {chat.map((m) => (
                <div key={m.id} className={cn('text-xs', m.kind === 'system' && 'text-muted-foreground italic')}>
                  <span className="font-medium text-gold-300/90">{m.author}</span>{' '}
                  <span className="text-muted-foreground">{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <p className="mt-0.5 leading-relaxed text-foreground/85">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Speak in text, if you must…"
                className="min-w-0 flex-1 rounded-full border border-gold-600/20 bg-white/70 px-3.5 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                aria-label="Chat message"
              />
              <button onClick={sendChat} className="mny-btn rounded-full px-3.5 py-2 text-xs font-semibold">send</button>
            </div>
          </div>

          {/* Solid Point */}
          <div className="mny-glass rounded-2xl p-3.5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-medium"><span className="text-champagne-300">◆</span> the Solid Point</h2>
            <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
              A Conclave ends when the table holds something. Write what was concluded — decisions carried, numbers set, names attached.
            </p>
            {solidSaved ? (
              <div className="rounded-xl border border-champagne-400/35 bg-champagne-500/10 p-3 text-xs text-champagne-200">
                Recorded. The table can stand up now — the point stays in the room&apos;s memory.
                <button onClick={() => go('conclave')} className="mt-2 block text-gold-300 hover:underline">Back to the floor →</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={solidTitle}
                  onChange={(e) => setSolidTitle(e.target.value)}
                  placeholder={room.name}
                  className="w-full rounded-lg border border-gold-600/20 bg-white/70 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                  aria-label="Solid point title"
                />
                {solidLines.map((l, i) => (
                  <input
                    key={i}
                    value={l}
                    onChange={(e) => setSolidLines((arr) => arr.map((x, k) => (k === i ? e.target.value : x)))}
                    placeholder={i === 0 ? 'What was concluded?' : 'Another line…'}
                    className="w-full rounded-lg border border-gold-600/20 bg-white/70 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                    aria-label={`Conclusion line ${i + 1}`}
                  />
                ))}
                <div className="flex items-center justify-between">
                  <button onClick={() => setSolidLines((a) => [...a, ''])} className="text-[11px] text-muted-foreground hover:text-foreground">＋ add line</button>
                  <button
                    onClick={saveSolid}
                    disabled={savingSolid || solidLines.every((l) => !l.trim())}
                    className="mny-btn rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    {savingSolid ? 'Recording…' : 'Record the solid point'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* controls */}
          <div className="flex items-center justify-center gap-2 pb-2">
            <CtrlButton active={micOn} onClick={toggleMic} label={micOn ? 'mute' : 'unmute'} glyph={micOn ? '◉' : '⃠'} />
            <CtrlButton active={camOn && !camError} onClick={toggleCam} label={camOn ? 'camera off' : 'camera on'} glyph={camOn ? '▣' : '▢'} />
          </div>
        </aside>
      </main>
    </div>
  )
}

function Tile({ name, micOn, camOn, speaking, kind, simulated, children }: {
  name: string
  micOn: boolean
  camOn: boolean
  speaking: boolean
  kind: 'VIDEO' | 'AUDIO'
  simulated?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      'relative aspect-video overflow-hidden rounded-2xl border bg-[oklch(0.27_0.025_262)]',
      speaking ? 'border-champagne-400/65 shadow-[0_0_26px_oklch(0.82_0.115_77/0.28)]' : 'border-foreground/10',
      simulated && 'border-dashed'
    )}>
      {kind === 'AUDIO' && <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-sapphire-500/10" />}
      {children}
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur">{name}</span>
        <span className="ml-auto flex gap-1">
          <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[10px] backdrop-blur', micOn ? 'bg-black/55 text-white' : 'bg-rose-500/70 text-white')} title={micOn ? 'mic on' : 'muted'}>
            {micOn ? '⏺' : '✕'}
          </span>
          {kind === 'VIDEO' && (
            <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[10px] backdrop-blur', camOn ? 'bg-black/55 text-white' : 'bg-rose-500/70 text-white')} title={camOn ? 'camera on' : 'camera off'}>
              {camOn ? '▣' : '✕'}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

function SilentTile({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-gold-500/10 via-transparent to-sapphire-500/10">
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function CtrlButton({ active, onClick, label, glyph }: { active: boolean; onClick: () => void; label: string; glyph: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex min-w-[72px] flex-col items-center gap-1 rounded-xl border px-4 py-2.5 text-[11px] transition',
        active ? 'border-gold-600/30 bg-gold-500/10 hover:bg-gold-500/20' : 'border-rose-500/30 bg-rose-500/10 text-rose-700'
      )}
    >
      <span className="text-base">{glyph}</span>
      {label}
    </button>
  )
}
