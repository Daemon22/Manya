'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, Footer, TopNav } from './chrome'
import { PasskeyModal } from './PasskeyModal'
import { timeAgo } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ConnectionRequest, EntityKind } from '@/lib/types'

const KIND_TONE: Record<EntityKind, string> = {
  HUMAN: 'text-gold-700 border-gold-400/35 bg-gold-400/10',
  INTELLIGENCE: 'text-ivory-800 border-ivory-300/30 bg-ivory-100/8',
  DEVICE: 'text-sapphire-700 border-sapphire-400/35 bg-sapphire-500/10',
  APPLICATION: 'text-sapphire-700 border-sapphire-400/25 bg-sapphire-500/8',
  SPACE: 'text-champagne-700 border-champagne-400/35 bg-champagne-500/10',
  ORGANIZATION: 'text-rose-700 border-rose-400/30 bg-rose-400/10',
}

type Tab = 'requests' | 'pairing' | 'inquiry'

export function Connect() {
  const { data, refresh, go } = useManya()
  const [tab, setTab] = useState<Tab>('requests')
  const [passkeyFor, setPasskeyFor] = useState<ConnectionRequest | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  const pending = useMemo(() => (data?.requests ?? []).filter((r) => r.status === 'PENDING'), [data])
  const decided = useMemo(() => (data?.requests ?? []).filter((r) => r.status !== 'PENDING').slice(0, 8), [data])
  const pairing = data?.pairing ?? null

  // QR for the current pairing payload
  useEffect(() => {
    if (!pairing) return
    let dead = false
    fetch('/api/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: `manya://connect?code=${pairing.code}&space=${encodeURIComponent('Your space')}` }),
    })
      .then((r) => r.json())
      .then((b) => { if (!dead && b.dataUrl) setQr(b.dataUrl) })
      .catch(() => {})
    return () => { dead = true }
  }, [pairing])

  const rotate = async () => {
    setRotating(true)
    await fetch('/api/pairing', { method: 'POST' })
    await refresh()
    setRotating(false)
  }

  const decide = async (request: ConnectionRequest, decision: 'APPROVED' | 'DECLINED', method: 'PASSKEY' | 'QR' | 'CODE') => {
    await fetch('/api/connections/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: request.id, decision, method }),
    })
    setPasskeyFor(null)
    await refresh()
  }

  const redeem = async () => {
    setRedeemMsg(null)
    if (redeemCode.trim().length !== 7) {
      setRedeemMsg({ ok: false, text: 'A pairing code is exactly seven characters.' })
      return
    }
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', code: redeemCode.trim(), fromName: data?.member?.name ?? 'You' }),
    })
    const body = await res.json()
    if (!res.ok) {
      setRedeemMsg({ ok: false, text: body.error ?? 'The code did not answer.' })
    } else {
      setRedeemMsg({ ok: true, text: `Inquiry delivered to ${body.target}. They still hold the key — connection waits for their yes.` })
      setRedeemCode('')
      await refresh()
    }
  }

  const requests = pending.filter((r) => r.fromName !== data?.member?.name)

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PasskeyModal
        open={!!passkeyFor}
        entity={passkeyFor ? { name: passkeyFor.fromName, kind: passkeyFor.fromKind, owner: passkeyFor.owner } : { name: '', kind: '', owner: '' }}
        onDone={() => passkeyFor && decide(passkeyFor, 'APPROVED', 'PASSKEY')}
        onCancel={() => setPasskeyFor(null)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* the distinction */}
        <div className="mny-glass mny-glow mb-8 rounded-3xl p-6 sm:p-8">
          <p className="mny-caps text-gold-700/90">✦ Reach · Connect</p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything here can reach everything. Only <span className="italic text-sapphire-700">permission</span> connects.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Being able to reach means you can find a space, a person, an intelligence, a device, and knock.
            Being able to connect means you were let in — by passkey, by a scanned code, or by the seven characters
            the other side chose to share. Even an intelligence you do not own — one from the Foundation, from another
            platform, from someone else entirely — waits at this same door.
          </p>
        </div>

        {/* tabs */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 mny-scroll">
          {([
            ['requests', `Requests · ${requests.length}`],
            ['pairing', 'Your pairing'],
            ['inquiry', 'Send an inquiry'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm transition',
                tab === id ? 'border-gold-400/45 bg-gold-400/10 text-gold-700' : 'border-gold-600/20 text-muted-foreground hover:bg-gold-600/10'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── REQUESTS ─────────────────────────────────────────────── */}
        {tab === 'requests' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              {requests.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No one is at your door. That is not a loneliness — it is a lock that works.</p>
              )}
              {requests.map((r, i) => (
                <div key={r.id} className="mny-rise mny-glass rounded-2xl p-5" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', KIND_TONE[r.fromKind])}>{r.fromKind.toLowerCase()}</span>
                    <span className="text-sm font-medium">{r.fromName}</span>
                    <span className="text-[11px] text-muted-foreground">held by {r.owner}</span>
                    {r.code && <span className="rounded bg-white/60 px-2 py-0.5 font-mono text-[11px] text-sapphire-700">{r.code}</span>}
                    <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">“{r.note}”</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">→ toward <span className="text-foreground">{r.toName}</span> · arrived by {r.method.toLowerCase()}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setPasskeyFor(r)}
                      className="rounded-full bg-champagne-400 px-4 py-2 text-xs font-semibold text-champagne-950 transition hover:bg-champagne-300"
                    >
                      Approve with passkey
                    </button>
                    {r.method === 'QR' && (
                      <button onClick={() => decide(r, 'APPROVED', 'QR')} className="rounded-full border border-sapphire-400/35 bg-sapphire-500/10 px-4 py-2 text-xs text-sapphire-700 transition hover:bg-sapphire-500/20">
                        Approve by scan
                      </button>
                    )}
                    {r.method === 'CODE' && (
                      <button onClick={() => decide(r, 'APPROVED', 'CODE')} className="rounded-full border border-sapphire-400/35 bg-sapphire-500/10 px-4 py-2 text-xs text-sapphire-700 transition hover:bg-sapphire-500/20">
                        Approve by code
                      </button>
                    )}
                    <button onClick={() => decide(r, 'DECLINED', 'PASSKEY')} className="rounded-full border border-gold-600/20 px-4 py-2 text-xs text-muted-foreground transition hover:bg-gold-600/10">
                      Not now
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <div className="mny-glass rounded-2xl p-4">
                <h3 className="mb-2 text-sm font-medium">Why a passkey?</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Because not every intelligence is yours. Some belong to the Foundation, some to other people, some to
                  other platforms entirely. Your passkey — held by Aruk, never by Manya — is the proof that <em>you</em> decided.
                </p>
              </div>
              <div className="mny-glass rounded-2xl p-4">
                <h3 className="mb-2 text-sm font-medium">Ledger</h3>
                <div className="space-y-1.5">
                  {decided.length === 0 && <p className="text-xs text-muted-foreground">Nothing decided yet.</p>}
                  {decided.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <span className={r.status === 'APPROVED' ? 'text-gold-700' : 'text-rose-700/80'}>{r.status === 'APPROVED' ? '✓' : '✕'}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.fromName} → {r.toName}</span>
                      <span className="text-[10px] text-muted-foreground/70">{r.method.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ── PAIRING ──────────────────────────────────────────────── */}
        {tab === 'pairing' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="mny-glass rounded-3xl p-6">
              <h2 className="font-display text-2xl font-semibold">Your door code</h2>
              <p className="mt-1 text-sm text-muted-foreground">Show the QR, or read the seven characters aloud. Either way, you still hold the key.</p>
              {pairing ? (
                <>
                  <div className="mx-auto mt-5 w-fit rounded-2xl border border-gold-600/25 bg-white p-2.5 shadow-[0_0_36px_oklch(0.75_0.125_88/0.18)]">
                    {qr ? <Image src={qr} alt={`Pairing QR code for ${pairing.code}`} width={208} height={208} unoptimized /> : <div className="h-[208px] w-[208px] animate-pulse rounded bg-white/70" />}
                  </div>
                  <div className="mt-5 text-center">
                    <p className="mny-caps text-muted-foreground">seven-character code</p>
                    <p className="mt-1.5 font-mono text-4xl font-semibold tracking-[0.3em] text-gold-700">{pairing.code}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">expires {new Date(pairing.expiresAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                  </div>
                  <button
                    onClick={rotate}
                    disabled={rotating}
                    className="mx-auto mt-5 block rounded-full border border-gold-600/25 px-5 py-2 text-xs text-gold-800 transition hover:bg-gold-400/10"
                  >
                    {rotating ? 'Cutting a new key…' : 'Rotate — retire this code and mint a new one'}
                  </button>
                </>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">No live code. <button onClick={rotate} className="text-gold-700 hover:underline">Mint one →</button></p>
              )}
            </div>

            <div className="space-y-4">
              <div className="mny-glass rounded-3xl p-6">
                <h2 className="font-display text-2xl font-semibold">Knock on another door</h2>
                <p className="mt-1 text-sm text-muted-foreground">Someone read you their seven characters. Deliver your inquiry — their key does the rest.</p>
                <input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase().slice(0, 7))}
                  placeholder="· · · · · · ·"
                  aria-label="Seven character pairing code"
                  className="mt-4 w-full rounded-xl border border-gold-600/20 bg-white/60 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none placeholder:text-muted-foreground/40 focus:border-gold-400/45"
                />
                <button onClick={redeem} className="mny-btn mt-3 w-full rounded-full py-2.5 text-sm font-semibold">
                  Send my connection request
                </button>
                {redeemMsg && (
                  <p className={cn('mt-3 rounded-lg border px-3 py-2 text-xs', redeemMsg.ok ? 'border-gold-400/25 bg-gold-400/10 text-gold-700' : 'border-rose-400/20 bg-rose-400/10 text-rose-700')}>
                    {redeemMsg.text}
                  </p>
                )}
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                  Try the live code under “Your door code” — in this prototype both sides live in one network, so your knock and their answer meet in the same ledger.
                </p>
              </div>
              <div className="mny-glass rounded-3xl p-6">
                <h3 className="font-display text-xl font-semibold">How the three keys differ</h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <li><span className="text-foreground">Passkey —</span> the owner approves in person, with what Aruk holds. Strongest, and personal.</li>
                  <li><span className="text-foreground">QR —</span> the code is shown, scanned, and the request walks in with it. Good for rooms and stages.</li>
                  <li><span className="text-foreground">Seven characters —</span> spoken over a call, written on paper. The oldest network there is: voice.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── INQUIRY ──────────────────────────────────────────────── */}
        {tab === 'inquiry' && <InquiryForm onSent={refresh} />}

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-gold-600/10 bg-white/600 p-4 text-xs text-muted-foreground">
          <AliveDot tone="champagne" className="scale-90" />
          <span>Aruk holds keys and grants · Lykon carries sessions between spaces · Manya-OS keeps the intelligences honest.</span>
          <button onClick={() => go('myweb')} className="ml-auto text-gold-700 hover:underline">See your web →</button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function InquiryForm({ onSent }: { onSent: () => Promise<void> }) {
  const { data } = useManya()
  const [toName, setToName] = useState('')
  const [fromKind, setFromKind] = useState<EntityKind>('HUMAN')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!toName.trim()) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inquire',
          fromName: data?.member?.name ?? 'You',
          fromKind,
          owner: fromKind === 'HUMAN' ? (data?.member?.name ?? 'You') : 'The Foundation',
          toName,
          note,
        }),
      })
      const body = await res.json()
      setMsg(res.ok ? 'Inquiry sent. Now the other side decides — that is the whole point.' : body.error ?? 'Could not send.')
      if (res.ok) { setToName(''); setNote(''); await onSent() }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mny-glass mx-auto max-w-xl rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold">Send a connection inquiry</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reach is free. Connection costs a yes from the other side. Say who you are, what you bring, and why the door should open.
      </p>
      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(['HUMAN', 'INTELLIGENCE', 'ORGANIZATION', 'DEVICE', 'APPLICATION', 'SPACE'] as EntityKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setFromKind(k)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition',
                fromKind === k ? KIND_TONE[k] : 'border-gold-600/20 text-muted-foreground hover:bg-gold-600/10'
              )}
            >
              {k.toLowerCase()}
            </button>
          ))}
        </div>
        <input
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          placeholder="Whose door are you knocking on? (space, person, or intelligence)"
          className="w-full rounded-xl border border-gold-600/20 bg-white/60 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
          aria-label="Target"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Your note — who you are, why you are here, what you bring."
          className="w-full resize-none rounded-xl border border-gold-600/20 bg-white/60 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-gold-400/45"
          aria-label="Note"
        />
        <button onClick={send} disabled={busy || !toName.trim()} className="mny-btn w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-40">
          {busy ? 'Sending…' : 'Deliver the inquiry'}
        </button>
        {msg && <p className="rounded-lg border border-gold-400/25 bg-gold-400/10 px-3 py-2 text-xs text-gold-700">{msg}</p>}
      </div>
    </div>
  )
}
