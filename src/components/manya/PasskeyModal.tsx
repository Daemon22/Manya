'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Aruk Passkey — the permission moment ────────────────────────────────
// Aruk is the keeper of credentials and keys (a sibling system). Here the
// passkey ceremony is simulated; when Aruk is federated, this modal will
// hand off to the real WebAuthn / Aruk grant flow.

export function PasskeyModal({ open, entity, onDone, onCancel }: {
  open: boolean
  entity: { name: string; kind: string; owner: string }
  onDone: (method: 'PASSKEY' | 'QR' | 'CODE') => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'granted'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset the ceremony whenever the door reopens (render-phase adjustment,
  // the React-endorsed way to derive state from prop changes).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPhase('idle')
  }

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  if (!open) return null

  const grant = () => {
    setPhase('scanning')
    timer.current = setTimeout(() => setPhase('granted'), 1400)
  }

  const finish = () => onDone('PASSKEY')

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Aruk passkey confirmation">
      <div className="mny-glass mny-rise w-full max-w-sm rounded-3xl p-6 text-center" style={{ boxShadow: '0 0 60px oklch(0.75 0.125 74 / 0.15)' }}>
        <p className="mny-caps text-champagne-700/90">✦ Aruk · keeper of keys</p>
        <h3 className="font-display mt-2 text-2xl font-semibold">Confirm with your passkey</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <span className="text-foreground">{entity.name}</span> — {entity.kind.toLowerCase()}, held by {entity.owner} — is asking to
          connect to your space. Permission is yours alone to give.
        </p>

        <div className="relative mx-auto mt-6 grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-gold-600/20 bg-white/60">
          {phase === 'idle' && (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.6" className="text-champagne-700" strokeLinecap="round" />
              <rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.6" className="text-champagne-700" />
            </svg>
          )}
          {phase === 'scanning' && (
            <>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-60">
                <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.6" className="text-champagne-700" strokeLinecap="round" />
                <rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.6" className="text-champagne-700" />
              </svg>
              <span className="mny-scan absolute left-2 right-2 h-0.5 rounded-full bg-champagne-500 shadow-[0_0_12px_oklch(0.70_0.115_75)]" />
            </>
          )}
          {phase === 'granted' && (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" className="text-gold-700" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <p className="mt-4 h-4 text-xs text-muted-foreground">
          {phase === 'scanning' && 'Verifying with the keeper…'}
          {phase === 'granted' && 'Key accepted. Aruk will log the grant.'}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {phase !== 'granted' ? (
            <button
              onClick={grant}
              disabled={phase === 'scanning'}
              className="rounded-full bg-champagne-400 px-5 py-2.5 text-sm font-semibold text-champagne-950 transition hover:bg-champagne-300 disabled:opacity-50"
            >
              {phase === 'scanning' ? 'Reading the key…' : 'Hold to confirm — passkey'}
            </button>
          ) : (
            <button onClick={finish} className="mny-btn rounded-full px-5 py-2.5 text-sm font-semibold">
              Let them in →
            </button>
          )}
          <button onClick={onCancel} className={cn('rounded-full px-5 py-2 text-xs text-muted-foreground transition hover:text-foreground', phase === 'scanning' && 'opacity-30')}>
            Not now
          </button>
        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          This ceremony stands in for the live Aruk federation. In production, Aruk holds the key; Manya never sees it.
        </p>
      </div>
    </div>
  )
}
