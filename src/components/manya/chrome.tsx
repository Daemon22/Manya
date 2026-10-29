'use client'

import { useManya } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'
import { EmblemMark } from './Emblem'

export type AliveTone = 'gold' | 'champagne' | 'sapphire' | 'ivory' | 'rose'

const TONE_BG: Record<AliveTone, string> = {
  gold: 'bg-gold-400',
  champagne: 'bg-champagne-400',
  sapphire: 'bg-sapphire-400',
  ivory: 'bg-ivory-600',
  rose: 'bg-rose-400',
}

export function AliveDot({ className, tone = 'gold' }: { className?: string; tone?: AliveTone }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span className={cn('mny-alive absolute inline-flex h-full w-full rounded-full', TONE_BG[tone])} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', TONE_BG[tone])} />
    </span>
  )
}

/** Map a community accent (current or legacy) to an alive-dot tone. */
export function accentTone(accent: string): AliveTone {
  switch (accent) {
    case 'champagne':
    case 'amber':
      return 'champagne'
    case 'sapphire':
    case 'cyan':
    case 'fuchsia':
      return 'sapphire'
    case 'ivory':
    case 'violet':
      return 'ivory'
    case 'rose':
      return 'rose'
    default:
      return 'gold'
  }
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <EmblemMark size={30} />
      {!compact && (
        <span className="font-display text-2xl font-semibold leading-none tracking-wide text-gold-800">
          Manya
          <span className="ml-2.5 align-middle font-sans text-[10px] font-normal uppercase tracking-[0.24em] text-muted-foreground">
            unify · collaborate · impact
          </span>
        </span>
      )}
    </span>
  )
}

const NAV: { id: View; label: string }[] = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'communities', label: 'Communities' },
  { id: 'conclave', label: 'Conclave' },
  { id: 'connect', label: 'Connect' },
  { id: 'myweb', label: 'My Web' },
]

export function TopNav() {
  const { view, go, data } = useManya()
  return (
    <header className="sticky top-0 z-40 border-b border-gold-600/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <button onClick={() => go('landing')} className="rounded-md outline-none ring-ring focus-visible:ring-2" aria-label="Manya home">
          <Brand />
        </button>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition-colors outline-none ring-ring focus-visible:ring-2',
                view === n.id || (n.id === 'conclave' && view === 'room') || (n.id === 'communities' && view === 'community')
                  ? 'bg-gold-400/10 text-gold-700'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gold-600/10'
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-gold-600/25 bg-gold-400/5 px-2.5 py-1 text-[11px] text-gold-700 sm:flex">
            <AliveDot /> alive
          </span>
          {data?.member ? (
            <button
              onClick={() => go('myweb')}
              className="rounded-full border border-gold-600/25 bg-gold-400/8 px-3 py-1.5 text-sm text-gold-800 hover:bg-gold-400/15"
              aria-label="Open your space"
            >
              {data.member.name.split(' ')[0]}
            </button>
          ) : (
            <button
              onClick={() => go('onboarding')}
              className="mny-btn rounded-full px-4 py-1.5 text-sm font-medium"
            >
              Begin indexing
            </button>
          )}
        </div>
      </div>
      {/* mobile nav */}
      <nav aria-label="Primary mobile" className="mny-scroll flex items-center gap-1 overflow-x-auto border-t border-gold-600/10 px-3 py-2 md:hidden">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => go(n.id)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-[13px]',
              view === n.id ? 'bg-gold-400/10 text-gold-700' : 'text-muted-foreground'
            )}
          >
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

export function Footer() {
  const go = useManya((s) => s.go)
  return (
    <footer className="mt-auto border-t border-gold-600/10 bg-background/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <Brand />
          <p className="text-xs text-muted-foreground">A space for enterprises, founders, researchers and explorers to connect — with permission.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Sibling name="Aruk" role="keeper of keys" tone="champagne" />
          <Sibling name="Lykon" role="the browser" tone="sapphire" />
          <Sibling name="Manya-OS" role="keeper of intelligences" tone="ivory" />
          <button onClick={() => go('connect')} className="ml-1 rounded-full border border-gold-600/20 px-3 py-1 hover:bg-gold-600/10">
            How connection works
          </button>
        </div>
      </div>
    </footer>
  )
}

function Sibling({ name, role, tone }: { name: string; role: string; tone: AliveTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-600/15 bg-white/60 px-2.5 py-1">
      <AliveDot tone={tone} className="scale-90" />
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-muted-foreground">· {role}</span>
    </span>
  )
}

export function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mny-caps mb-2 text-gold-700/90">✦ {eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  )
}
