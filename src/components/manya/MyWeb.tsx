'use client'

import { useMemo } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, Footer, SectionHead, TopNav } from './chrome'
import { roleLabel, domainLabel, timeAgo } from '@/lib/constants'
import { cn } from '@/lib/utils'

const KIND_GLYPH: Record<string, string> = { DEVICE: '▣', APPLICATION: '⌘', SPACE: '⬡', INTELLIGENCE: '✦' }

export function MyWeb() {
  const { data, go, openRoom } = useManya()
  const devices = data?.devices ?? []
  const member = data?.member

  const linked = devices.filter((d) => d.status === 'LINKED').length

  const community = useMemo(
    () => data?.communities.find((c) => c.slug === member?.resonance?.placement),
    [data, member]
  )

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* profile */}
        <section className="mny-glass mny-glow mb-8 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mny-caps text-gold-700/90">✦ Your resonance card</p>
              <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{member ? member.resonance.headline : 'Not indexed yet'}</h1>
              {member ? (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.name} · @{member.handle} · placed at {member.resonance.placementName}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{member.resonance.summary}</p>
                  {member.purpose && member.purpose !== 'Seeking connection.' && (
                    <p className="mt-2 border-l-2 border-gold-400/40 pl-3 text-sm italic text-muted-foreground">“{member.purpose}”</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {member.roles.map((r) => (
                      <span key={r} className="rounded-full border border-gold-400/25 bg-gold-400/5 px-2.5 py-1 text-[11px] text-gold-700">
                        {roleLabel(r)}
                      </span>
                    ))}
                    {member.domains.map((d) => (
                      <span key={d} className="rounded-full border border-gold-600/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {domainLabel(d)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">The circle doesn&apos;t know your shape yet. Two minutes of indexing and the rooms will know where to expect you.</p>
                  <button onClick={() => go('onboarding')} className="mny-btn mt-4 rounded-full px-5 py-2.5 text-sm font-semibold">
                    Begin indexing →
                  </button>
                </div>
              )}
            </div>
            {member && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">resonance</p>
                <p className="text-6xl font-semibold text-gold-700">{member.resonance.score}</p>
                {community && (
                  <button onClick={() => go('communities')} className="mt-2 text-[11px] text-gold-700 hover:underline">
                    {community.aliveNow} alive at your placement →
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* the web */}
        <SectionHead eyebrow="My Web" title="Everything that is yours, already holding hands">
          Devices, applications, spaces and intelligences that belong to the same person connect seamlessly — walk from
          your bench terminal to your pocket slate mid-sentence, and the session follows. Not everything here is yours:
          what belongs to the Foundation or to others joined only by permission, and it shows.
        </SectionHead>

        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <AliveDot />
          <span>{linked} of {devices.length} nodes linked · sessions hand off between them</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d, i) => (
            <div
              key={d.id}
              className={cn(
                'mny-rise mny-glass rounded-2xl p-4',
                d.status === 'PENDING' && 'border-amber-400/25',
                d.status === 'OFFLINE' && 'opacity-60'
              )}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/60 text-base">{KIND_GLYPH[d.kind] ?? '▣'}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.kind.toLowerCase()} · {timeAgo(d.lastSeen)}</p>
                </div>
                <span className={cn(
                  'ml-auto rounded-full px-2 py-0.5 text-[10px]',
                  d.status === 'LINKED' && 'bg-gold-400/10 text-gold-700',
                  d.status === 'PENDING' && 'bg-champagne-500/10 text-champagne-700',
                  d.status === 'OFFLINE' && 'bg-white/60 text-muted-foreground'
                )}>
                  {d.status === 'LINKED' && 'linked'}
                  {d.status === 'PENDING' && 'awaiting passkey'}
                  {d.status === 'OFFLINE' && 'offline'}
                </span>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{d.detail}</p>
            </div>
          ))}
        </div>

        {/* quick actions */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <button onClick={() => go('connect')} className="mny-glass rounded-2xl p-5 text-left transition hover:border-gold-600/35">
            <p className="text-sm font-medium">Connect something new</p>
            <p className="mt-1 text-xs text-muted-foreground">By passkey, QR, or the seven characters.</p>
          </button>
          <button
            onClick={() =>
              openRoom({
                id: `web-${Date.now()}`, name: 'My web — sync table',
                topic: 'A standing Conclave where your devices and intelligences report in.',
                host: member?.name ?? 'You', kind: 'VIDEO', active: true, capacity: 8, createdAt: new Date().toISOString(),
              })
            }
            className="mny-glass rounded-2xl p-5 text-left transition hover:border-gold-600/35"
          >
            <p className="text-sm font-medium">Convene your web</p>
            <p className="mt-1 text-xs text-muted-foreground">Call your own nodes together — a meeting of one, out loud.</p>
          </button>
          <button onClick={() => go('pulse')} className="mny-glass rounded-2xl p-5 text-left transition hover:border-gold-600/35">
            <p className="text-sm font-medium">Back to the Pulse</p>
            <p className="mt-1 text-xs text-muted-foreground">See who is seeking, offering, arguing.</p>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
