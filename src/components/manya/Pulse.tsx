'use client'

import { useMemo, useState } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, Footer, TopNav } from './chrome'
import { INTENTS, TONE_CLASSES, timeAgo } from '@/lib/constants'
import type { Post, PostKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS: { id: 'ALL' | PostKind; label: string }[] = [
  { id: 'ALL', label: 'Everything' },
  { id: 'SEEKING_FUNDING', label: 'Funding' },
  { id: 'OFFERING_SUPPORT', label: 'Support' },
  { id: 'SEEKING_PARTNERSHIP', label: 'Partnership' },
  { id: 'SEEKING_TALENT', label: 'Talent' },
  { id: 'DEBATE', label: 'Debates' },
  { id: 'SHOWCASE', label: 'Showcase' },
  { id: 'AID', label: 'Aid' },
]

export function Pulse() {
  const { data, go, openCommunity, refresh, openRoom } = useManya()
  const [filter, setFilter] = useState<'ALL' | PostKind>('ALL')
  const [composing, setComposing] = useState(false)
  const [kind, setKind] = useState<PostKind>('DISCUSSION')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const posts = useMemo(() => {
    const list = data?.posts ?? []
    return filter === 'ALL' ? list : list.filter((p) => p.kind === filter)
  }, [data, filter])

  const alive = useMemo(
    () => (data?.communities ?? []).slice(0, 6),
    [data]
  )

  const me = data?.member?.name ?? 'An open signal'

  const send = async () => {
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, body, author: me }),
      })
      if (res.ok) {
        setTitle(''); setBody(''); setComposing(false)
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const react = async (id: string, action: 'support' | 'echo') => {
    await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    await refresh()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* ── Feed column ── */}
        <div>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight">The Pulse</h1>
              <p className="mt-1 text-sm text-muted-foreground">What the circle is seeking, offering, and arguing about — right now.</p>
            </div>
            <button
              onClick={() => setComposing((c) => !c)}
              className="mny-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
            >
              {composing ? 'Fold it away' : 'Speak into the Pulse'}
            </button>
          </div>

          {composing && (
            <div className="mny-glass mny-rise mb-5 rounded-2xl p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(Object.keys(INTENTS) as PostKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition',
                      kind === k ? TONE_CLASSES[INTENTS[k].tone].badge : 'border-gold-600/20 text-muted-foreground hover:bg-gold-600/10'
                    )}
                  >
                    {INTENTS[k].glyph} {INTENTS[k].label}
                  </button>
                ))}
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Say it plainly — what is this?"
                className="mb-2 w-full rounded-xl border border-gold-600/20 bg-white/60 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                aria-label="Post title"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="The body of it. If it is a debate, plant a question worth defending."
                className="w-full resize-none rounded-xl border border-gold-600/20 bg-white/60 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
                aria-label="Post body"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Posting as <span className="text-foreground">{me}</span></span>
                <button
                  onClick={send}
                  disabled={busy || !title.trim() || !body.trim()}
                  className="mny-btn rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
                >
                  {busy ? 'Sending…' : 'Release into the Pulse'}
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 mny-scroll">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition',
                  filter === f.id ? 'border-gold-400/45 bg-gold-400/10 text-gold-700' : 'border-gold-600/20 text-muted-foreground hover:bg-gold-600/10'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {posts.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing in this frequency yet. Start it.</p>}
            {posts.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                index={i}
                onSupport={() => react(p.id, 'support')}
                onEcho={() => react(p.id, 'echo')}
                onCommunity={p.communitySlug ? () => openCommunity(p.communitySlug!) : undefined}
                onConvene={
                  ['DEBATE', 'DISCUSSION', 'SHOWCASE'].includes(p.kind)
                    ? () =>
                        openRoom({
                          id: `pulse-${p.id}`,
                          name: `Conclave — ${p.title.slice(0, 38)}${p.title.length > 38 ? '…' : ''}`,
                          topic: p.title,
                          host: p.author,
                          kind: p.kind === 'DEBATE' ? 'AUDIO' : 'VIDEO',
                          active: true,
                          capacity: 8,
                          createdAt: p.createdAt,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="mny-glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <AliveDot />
              <h2 className="text-sm font-medium">Alive right now</h2>
            </div>
            <div className="space-y-2">
              {alive.map((c) => (
                <button key={c.slug} onClick={() => openCommunity(c.slug)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-gold-600/10">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{c.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{c.tagline}</span>
                  </span>
                  <span className={cn('shrink-0 text-xs font-medium', TONE_CLASSES[c.accent]?.text ?? 'text-gold-700')}>{c.aliveNow}</span>
                </button>
              ))}
            </div>
            <button onClick={() => go('communities')} className="mt-3 w-full rounded-lg border border-gold-600/20 py-2 text-xs text-muted-foreground transition hover:bg-gold-600/10">
              All communities →
            </button>
          </div>

          <div className="mny-glass rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-medium">Not like the noise</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              There is no endless scroll here, no audience performing for strangers. People come to be useful, to argue
              honestly, to teach, to fund, to build. Fun, in an innovative way.
            </p>
            <button onClick={() => go('connect')} className="mt-3 text-xs text-gold-700 hover:underline">
              How reach becomes connection →
            </button>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  )
}

function PostCard({ post: p, index, onSupport, onEcho, onCommunity, onConvene }: {
  post: Post
  index: number
  onSupport: () => void
  onEcho: () => void
  onCommunity?: () => void
  onConvene?: () => void
}) {
  const meta = INTENTS[p.kind]
  const tone = TONE_CLASSES[meta.tone]
  return (
    <article className={cn('mny-rise mny-glass rounded-2xl p-5', p.authorKind === 'INTELLIGENCE' && 'border-ivory-300/25')} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', tone.badge)}>
          <span>{meta.glyph}</span> {meta.label}
        </span>
        {p.communitySlug && (
          <button onClick={onCommunity} className="rounded-full border border-gold-600/20 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-gold-600/10">
            {p.communitySlug}
          </button>
        )}
        {p.authorKind === 'INTELLIGENCE' && (
          <span className="rounded-full border border-ivory-300/30 bg-ivory-100/8 px-2.5 py-1 text-[11px] text-ivory-800">intelligence</span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(p.createdAt)}</span>
      </div>
      <h3 className="text-base font-medium leading-snug">{p.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">— {p.author}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={onSupport} className="rounded-full border border-gold-600/20 px-3 py-1.5 text-xs transition hover:bg-gold-600/10" aria-label="Support this post">
            ✦ Support · {p.supportCount}
          </button>
          <button onClick={onEcho} className="rounded-full border border-gold-600/20 px-3 py-1.5 text-xs transition hover:bg-gold-600/10" aria-label="Echo this post">
            ⇄ Echo · {p.echoCount}
          </button>
          {onConvene && (
            <button onClick={onConvene} className="rounded-full border border-gold-400/35 bg-gold-400/10 px-3 py-1.5 text-xs text-gold-700 transition hover:bg-gold-400/20">
              Convene a Conclave →
            </button>
          )}
        </span>
      </div>
    </article>
  )
}
