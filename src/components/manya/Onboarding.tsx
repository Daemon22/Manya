'use client'

import { useMemo, useState } from 'react'
import { useManya } from '@/lib/store'
import { AliveDot, Footer } from './chrome'
import { DOMAINS, ROLES, SEEKING, STYLES, STYLE_OTHER, asCustom } from '@/lib/constants'
import type { ResonanceResult } from '@/lib/types'
import { cn } from '@/lib/utils'

const STEPS = ['Who you are', 'What you seek', 'Where you resonate', 'How you think', 'Your name & purpose']

export function Onboarding() {
  const { go, data, refresh } = useManya()
  const [step, setStep] = useState(0)
  const [roles, setRoles] = useState<string[]>([])
  const [rolesOther, setRolesOther] = useState(false)
  const [rolesText, setRolesText] = useState('')
  const [seeking, setSeeking] = useState<string[]>([])
  const [seekingOther, setSeekingOther] = useState(false)
  const [seekingText, setSeekingText] = useState('')
  const [domains, setDomains] = useState<string[]>([])
  const [domainsOther, setDomainsOther] = useState(false)
  const [domainsText, setDomainsText] = useState('')
  const [style, setStyle] = useState<string>('')
  const [styleText, setStyleText] = useState('')
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ResonanceResult | null>(null)
  const [error, setError] = useState('')

  const voiced = (t: string) => t.trim().length > 0

  const canNext = useMemo(() => {
    if (step === 0) return roles.length > 0 || (rolesOther && voiced(rolesText))
    if (step === 1) return seeking.length > 0 || (seekingOther && voiced(seekingText))
    if (step === 2) return domains.length > 0 || (domainsOther && voiced(domainsText))
    if (step === 3) return style !== '' && (style !== STYLE_OTHER || voiced(styleText))
    if (step === 4) return name.trim().length >= 2
    return true
  }, [step, roles, rolesOther, rolesText, seeking, seekingOther, seekingText, domains, domainsOther, domainsText, style, styleText, name])

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    // The open door: free-text answers ride along with the taxonomy —
    // sent as `custom:<text>` so the index and the profile both hear them.
    const roleList = rolesOther && voiced(rolesText) ? [...roles, asCustom(rolesText)] : roles
    const seekList = seekingOther && voiced(seekingText) ? [...seeking, asCustom(seekingText)] : seeking
    const domainList = domainsOther && voiced(domainsText) ? [...domains, asCustom(domainsText)] : domains
    const styleValue = style === STYLE_OTHER ? asCustom(styleText) : style
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roles: roleList, seeking: seekList, domains: domainList, style: styleValue, purpose }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'The index refused the entry.')
      setResult(body.resonance as ResonanceResult)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // ── Result: the Resonance Card ────────────────────────────────────────
  if (result) {
    const community = data?.communities.find((c) => c.slug === result.placement)
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-14 sm:px-6">
          <div className="mny-rise text-center">
            <p className="mny-caps text-gold-700/90">✦ The index has placed you</p>
            <h2 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{result.headline}</h2>
          </div>

          <div className="mny-glass mny-glow mny-rise mt-8 rounded-3xl p-6 sm:p-8" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Resonance</p>
                <p className="mt-1 text-5xl font-semibold text-gold-700">{result.score}<span className="text-lg text-muted-foreground">/99</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Placed at</p>
                <p className="mt-1 text-xl font-medium">{result.placementName}</p>
                {community && (
                  <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <AliveDot /> {community.aliveNow} alive there now · {community.tagline}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-5 border-l-2 border-gold-400/40 pl-4 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

            <div className="mt-6">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Who is already waiting for you</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {result.matches.map((m) => (
                  <div key={m.name} className="rounded-xl border border-gold-600/10 bg-white/60 p-3">
                    <p className="text-sm font-medium">{m.name.trim()}</p>
                    <p className="mt-0.5 text-[11px] text-sapphire-700/90">{m.kind}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => go('pulse')}
                className="mny-btn rounded-full px-6 py-3 text-sm font-semibold"
              >
                Enter Manya — you are expected →
              </button>
              <button
                onClick={() => go(community ? 'communities' : 'communities')}
                className="rounded-full border border-gold-600/25 bg-gold-400/5 px-6 py-3 text-sm text-gold-800 transition hover:bg-gold-400/12"
              >
                Visit {result.placementName} first
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── The questionnaire ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="mny-caps text-gold-700/90">✦ The Indexing</p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A few questions, so the circle knows where you resonate</h2>
          <div className="mt-5 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-1.5">
                <div className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-gold-400' : 'bg-gold-300/12')} />
                <span className={cn('hidden text-[10px] sm:block', i === step ? 'text-gold-700' : 'text-muted-foreground')}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mny-glass rounded-3xl p-6 sm:p-8">
          {step === 0 && (
            <Question title="Who are you here as?" hint="Choose every coat you wear. The first one leads.">
              <Grid>
                {ROLES.map((r) => (
                  <Choice key={r.id} active={roles.includes(r.id)} onClick={() => toggle(roles, setRoles, r.id)} glyph={r.glyph} label={r.label} hint={r.hint} />
                ))}
                <Choice
                  span
                  active={rolesOther}
                  onClick={() => setRolesOther((v) => !v)}
                  glyph="◇"
                  label="Other — in your own words"
                  hint="None of these hold you? Write what you are."
                />
              </Grid>
              {rolesOther && (
                <WriteIn
                  value={rolesText}
                  onChange={setRolesText}
                  label="What you are, in your own words"
                  placeholder="I am a cartographer of silences, a poet of circuits, a keeper of archives…"
                />
              )}
            </Question>
          )}
          {step === 1 && (
            <Question title="What are you seeking?" hint="Be honest — the tissue routes by need.">
              <Grid>
                {SEEKING.map((s) => (
                  <Choice key={s.id} active={seeking.includes(s.id)} onClick={() => toggle(seeking, setSeeking, s.id)} label={s.label} hint={s.hint} />
                ))}
                <Choice
                  span
                  active={seekingOther}
                  onClick={() => setSeekingOther((v) => !v)}
                  glyph="◇"
                  label="Other — something only you can name"
                  hint="Name what you seek, in your words."
                />
              </Grid>
              {seekingOther && (
                <WriteIn
                  value={seekingText}
                  onChange={setSeekingText}
                  label="What you seek, in your own words"
                  placeholder="I am looking for someone who will challenge the whole plan, kindly…"
                />
              )}
            </Question>
          )}
          {step === 2 && (
            <Question title="Where do you resonate?" hint="Domains are rooms. Pick the ones where your mind is loudest.">
              <Grid cols={2}>
                {DOMAINS.map((d) => (
                  <Choice key={d.id} active={domains.includes(d.id)} onClick={() => toggle(domains, setDomains, d.id)} label={d.label} />
                ))}
                <Choice
                  span
                  active={domainsOther}
                  onClick={() => setDomainsOther((v) => !v)}
                  glyph="◇"
                  label="Other — a field of your own"
                  hint="Where does your mind actually live?"
                />
              </Grid>
              {domainsOther && (
                <WriteIn
                  value={domainsText}
                  onChange={setDomainsText}
                  label="Your field, in your own words"
                  placeholder="My work lives between ocean sensors and oral history…"
                />
              )}
            </Question>
          )}
          {step === 3 && (
            <Question title="How do you think best?" hint="This is why Conclave exists — some visions refuse to fit in text.">
              <div className="grid gap-2">
                {STYLES.map((s) => (
                  <Choice
                    key={s.id}
                    active={style === s.id}
                    onClick={() => setStyle(s.id)}
                    label={s.label}
                    hint={s.hint}
                    wide
                  />
                ))}
                <Choice
                  active={style === STYLE_OTHER}
                  onClick={() => setStyle(STYLE_OTHER)}
                  label="Other — my own way"
                  hint="Describe how your mind moves."
                  wide
                />
                {style === STYLE_OTHER && (
                  <WriteIn
                    value={styleText}
                    onChange={setStyleText}
                    label="How you think, in your own words"
                    placeholder="When I think, I pace and draw maps, and speak in fragments until they click…"
                  />
                )}
              </div>
            </Question>
          )}
          {step === 4 && (
            <Question title="Finally — your name, and your purpose" hint="The purpose hangs on your profile like a lantern.">
              <div className="space-y-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name, your enterprise, or your chosen handle"
                  className="w-full rounded-xl border border-gold-600/20 bg-white/60 px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-gold-400/45"
                  aria-label="Your name"
                />
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="One line of purpose — what are you building, seeking, or defending?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gold-600/20 bg-white/60 px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-gold-400/45"
                  aria-label="Your purpose"
                />
              </div>
            </Question>
          )}

          {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="mny-btn rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canNext || busy}
                className="mny-btn rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {busy ? 'Reading the circle…' : 'Place me'}
              </button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Question({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return <div className={cn('grid gap-2', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>{children}</div>
}

function Choice({ active, onClick, label, hint, glyph, wide, span }: {
  active: boolean
  onClick: () => void
  label: string
  hint?: string
  glyph?: string
  wide?: boolean
  span?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-3.5 text-left transition outline-none ring-ring focus-visible:ring-2',
        wide && 'sm:items-center',
        span && 'sm:col-span-2',
        active
          ? 'border-gold-400/45 bg-gold-400/10 ring-1 ring-gold-400/30'
          : 'border-gold-600/20 bg-white/60 hover:border-gold-600/25 hover:bg-white/65'
      )}
    >
      {glyph && <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base', active ? 'bg-gold-400/20 text-gold-800' : 'bg-white/60 text-muted-foreground')}>{glyph}</span>}
      <span className="min-w-0">
        <span className={cn('block text-sm font-medium', active && 'text-gold-800')}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className={cn('ml-auto mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', active ? 'border-gold-200 bg-gold-400' : 'border-white/20')}>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-gold-950" />}
      </span>
    </button>
  )
}

// The open door — one line of free text next to every taxonomy.
function WriteIn({ value, onChange, placeholder, label }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="mny-rise mt-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus
        className="w-full rounded-xl border border-gold-400/35 bg-gold-400/5 px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-gold-400/60"
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">Your words enter the index as they are — they weigh as much as any category.</p>
    </div>
  )
}
