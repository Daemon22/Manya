'use client'

import { useMemo, useState } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, Footer, SectionHead, TopNav } from './chrome'
import { timeAgo } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function Conclave() {
  const { data, go, openRoom, refresh } = useManya()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [kind, setKind] = useState<'VIDEO' | 'AUDIO'>('VIDEO')
  const [busy, setBusy] = useState(false)

  const rooms = data?.rooms ?? []
  const outcomesByRoom = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of data?.outcomes ?? []) map.set(o.roomId, (map.get(o.roomId) ?? 0) + 1)
    return map
  }, [data])

  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, topic, kind, host: data?.member?.name ?? 'You' }),
      })
      const body = await res.json()
      if (res.ok && body.id) {
        await refresh()
        openRoom({ id: body.id, name, topic: topic || 'A table set for an honest conversation.', host: data?.member?.name ?? 'You', kind, active: true, capacity: 8, createdAt: new Date().toISOString() })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <SectionHead eyebrow="Conclave" title="Tables for three or more, because vision doesn't fit in text">
          Text makes you construct sentences while you are trying to show a vision — it scatters the mind. Here, founders
          meet, teachers call their students, debaters take floors, and every session ends with a solid point written down.
        </SectionHead>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCreating((c) => !c)}
            className="mny-btn rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            {creating ? 'Never mind' : 'Set a table'}
          </button>
          <span className="text-xs text-muted-foreground">Video or audio · 3 seats minimum by design · chat on the side · Solid Point at the end</span>
        </div>

        {creating && (
          <div className="mny-glass mny-rise mb-6 rounded-2xl p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Conclave name — 'Founders' Tuesday table'"
                className="rounded-xl border border-gold-600/20 bg-white/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                aria-label="Conclave name"
              />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is on the table?"
                className="rounded-xl border border-gold-600/20 bg-white/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                aria-label="Topic"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {(['VIDEO', 'AUDIO'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs transition',
                      kind === k ? 'border-gold-400/45 bg-gold-400/10 text-gold-700' : 'border-gold-600/20 text-muted-foreground hover:bg-gold-600/10'
                    )}
                  >
                    {k === 'VIDEO' ? '◉ Video' : '◎ Audio only'}
                  </button>
                ))}
              </div>
              <button
                onClick={create}
                disabled={busy || !name.trim()}
                className="mny-btn rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {busy ? 'Setting…' : 'Open the table →'}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r, i) => {
            const solid = outcomesByRoom.get(r.id) ?? 0
            return (
              <button
                key={r.id}
                onClick={() => openRoom(r)}
                className="mny-rise mny-glass rounded-2xl p-5 text-left transition hover:border-gold-600/35 hover:shadow-[0_10px_28px_oklch(0.55_0.09_82/0.14)]"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{r.kind === 'VIDEO' ? '◉' : '◎'}</span>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]',
                    r.active ? 'border-gold-400/35 bg-gold-400/10 text-gold-700' : 'border-gold-600/20 text-muted-foreground')}>
                    {r.active ? (<><AliveDot className="scale-90" /> live now</>) : 'settled'}
                  </span>
                  {solid > 0 && <span className="ml-auto rounded-full bg-champagne-500/10 px-2.5 py-1 text-[11px] text-champagne-700">◆ {solid} solid point{solid > 1 ? 's' : ''}</span>}
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug">{r.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.topic}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>hosted by {r.host}</span>
                  <span>take a seat →</span>
                </div>
              </button>
            )
          })}
        </div>

        {rooms.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No tables are set. Set the first one.</p>
            <button onClick={() => go('communities')} className="mt-3 text-sm text-gold-700 hover:underline">Or find a community first →</button>
          </div>
        )}

        {/* Past solid points */}
        {(data?.outcomes?.length ?? 0) > 0 && (
          <section className="mt-12">
            <h2 className="font-display mb-4 text-2xl font-semibold">Solid points the circle has already landed</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {data!.outcomes.slice(0, 4).map((o) => {
                const room = rooms.find((r) => r.id === o.roomId)
                return (
                  <div key={o.id} className="mny-glass rounded-2xl p-5">
                    <p className="mny-caps text-champagne-700/90">◆ solid point</p>
                    <h3 className="mt-1 text-sm font-medium">{o.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{room ? room.name : 'a session'} · by {o.by} · {timeAgo(o.createdAt)}</p>
                    <ul className="mt-3 space-y-1.5">
                      {o.points.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="text-champagne-700">—</span>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
