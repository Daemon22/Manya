'use client'

import { useMemo, useState } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, accentTone, Footer, SectionHead, TopNav } from './chrome'
import { TONE_CLASSES, accentHex, timeAgo } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Outcome } from '@/lib/types'

export function Communities() {
  const { data, openCommunity, go } = useManya()
  const [q, setQ] = useState('')
  const communities = useMemo(() => {
    const list = data?.communities ?? []
    if (!q.trim()) return list
    const needle = q.toLowerCase()
    return list.filter((c) => `${c.name} ${c.tagline} ${c.domain} ${c.purpose}`.toLowerCase().includes(needle))
  }, [data, q])

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <SectionHead eyebrow="Communities" title="Rooms with a purpose, not a vibe">
          Every community exists because somebody needed it: a forge for ventures, a bridge to capital, a parlor for
          hypotheses, an arena for the day&apos;s argument. Join one, or ask the circle for a new one.
        </SectionHead>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, domain, or purpose…"
          className="mb-6 w-full max-w-md rounded-full border border-gold-600/20 bg-white/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
          aria-label="Search communities"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c, i) => {
            const tone = TONE_CLASSES[c.accent] ?? TONE_CLASSES.gold
            return (
              <button
                key={c.slug}
                onClick={() => openCommunity(c.slug)}
                className="mny-rise mny-glass group rounded-2xl p-5 text-left transition hover:border-gold-600/35 hover:shadow-[0_10px_28px_oklch(0.55_0.09_82/0.14)]"
                style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg text-base font-semibold"
                    style={{ background: `${accentHex(c.accent)}1f`, color: accentHex(c.accent) }}
                  >
                    {c.name.slice(0, 1)}
                  </span>
                  <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]', tone.badge)}>
                    <AliveDot tone={accentTone(c.accent)} className="scale-90" />
                    {c.aliveNow} alive
                  </span>
                </div>
                <h3 className="text-base font-medium leading-snug">{c.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{c.purpose}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{c.memberCount.toLocaleString()} members</span>
                  <span className="capitalize">{c.domain}</span>
                </div>
              </button>
            )
          })}
        </div>
        {communities.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No room answers to that name yet.</p>
            <button onClick={() => go('pulse')} className="mt-3 text-sm text-gold-700 hover:underline">Speak into the Pulse instead →</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export function CommunityDetail() {
  const { data, activeCommunity, go, openRoom } = useManya()
  const community = data?.communities.find((c) => c.slug === activeCommunity)
  if (!community) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">That room dissolved. </p>
        </main>
        <Footer />
      </div>
    )
  }

  const posts = (data?.posts ?? []).filter((p) => p.communitySlug === community.slug)
  const outcomes: Outcome[] = []
  const tone = TONE_CLASSES[community.accent] ?? TONE_CLASSES.gold

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <button onClick={() => go('communities')} className="mb-5 text-xs text-muted-foreground transition hover:text-foreground">← All communities</button>

        <div className={cn('mny-glass mny-rise rounded-3xl p-6 sm:p-8')}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]', tone.badge)}>
                <AliveDot tone={accentTone(community.accent)} />
                {community.aliveNow} alive now · {community.memberCount.toLocaleString()} members
              </span>
              <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">{community.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{community.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{community.purpose}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  openRoom({
                    id: `c-${community.slug}`, name: `${community.name} — open table`, topic: `An open Conclave for ${community.name}.`,
                    host: data?.member?.name ?? 'You', kind: 'VIDEO', active: true, capacity: 8, createdAt: new Date().toISOString(),
                  })
                }
                className="mny-btn rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Convene a Conclave
              </button>
              <button onClick={() => go('pulse')} className="rounded-full border border-gold-600/20 px-5 py-2.5 text-sm transition hover:bg-gold-600/10">
                Speak in the Pulse
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          <section>
            <h2 className="font-display mb-4 text-2xl font-semibold">Discussions on the table</h2>
            {posts.length === 0 && <p className="text-sm text-muted-foreground">Quiet in here — open the floor with the first word.</p>}
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="mny-glass rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={cn('rounded-full border px-2 py-0.5', tone.badge)}>{p.kind.replaceAll('_', ' ').toLowerCase()}</span>
                    <span>{timeAgo(p.createdAt)}</span>
                    <span className="ml-auto">— {p.author}{p.authorKind === 'INTELLIGENCE' ? ' · intelligence' : ''}</span>
                  </div>
                  <h3 className="text-sm font-medium">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-4">
            <div className="mny-glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-medium">Sessions that ended in something</h3>
              {outcomes.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">No solid points recorded here yet. Convene a Conclave and close one properly.</p>}
              {outcomes.map((o) => (
                <div key={o.id} className="mb-2 text-xs">{o.title}</div>
              ))}
            </div>
            <div className="mny-glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-medium">House rules</h3>
              <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                <li>· Voice is welcome; so is silence.</li>
                <li>· A session ends with a solid point or it did not end.</li>
                <li>· Strangers may reach you; only you let them connect.</li>
                <li>· Intelligences are participants, marked as such.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
