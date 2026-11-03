'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useManya } from '@/lib/store'
import { NeuralCanvas } from './NeuralCanvas'
import { CrestAtmosphere, CursorLight, DawnVeil } from './CrestAtmosphere'
import { AliveDot, Footer, SectionHead } from './chrome'
import { AccountDialog } from './AccountDialog'
import { GoldRule } from './Emblem'
import { ROLES } from '@/lib/constants'

export function Landing() {
  const { go, data } = useManya()
  const [accountOpen, setAccountOpen] = useState(false)
  const stats = data?.stats

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Hero: the crest and the word share the morning ────────────────
          Nothing generated, nothing cut out, nothing masked, nothing washed
          over. The minted image stands complete at the page's left edge —
          the crown of its sky, the ring, the clasped hands, the MANYA
          lettering, the golden lake — every pixel at native sharpness. At
          its eastern edge the dawn pours into the ivory page, and there,
          in the light it pours, the word is spoken beside it. The crest
          does not take the whole stage: it shares the morning with the
          message, and the two breathe as one scene. */}

      {/* Wide stages — the crest complete on the left, the word beside it. */}
      <section className="hero-immersive relative overflow-hidden">
        {/* the minted crest, breathing — one image, whole, wrapped in living light */}
        <div className="hero-crest relative shrink-0">
          <div className="crest-breathe absolute inset-0">
            <Image
              src="/brand/emblem-dawn.png"
              alt="The Manya emblem — two hands clasped inside a golden ring above the word MANYA and the motto Unify, Collaborate, Impact, over a mountain lake at sunrise"
              width={1254}
              height={1254}
              priority
              unoptimized
              className="h-full w-full object-cover"
            />
            <CrestAtmosphere />
          </div>
          {/* the dawn pours into the page at the crest's eastern edge */}
          <div className="absolute inset-y-0 right-0 w-16 bg-[linear-gradient(90deg,transparent_0%,oklch(0.965_0.014_96/0.38)_52%,oklch(0.965_0.014_96)_88%,oklch(0.965_0.014_96)_100%)] md:w-24" />
          {/* and into the page's morning at its southern shore */}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-background" />
        </div>
        <CursorLight />
        {/* the word, spoken in the light the crest pours */}
        <div className="mny-scroll relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="m-auto w-full max-w-2xl px-5 py-12 text-center sm:px-8">
            <h1
              className="mny-rise font-display text-[clamp(1.9rem,2.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight"
              style={{ animationDelay: '80ms' }}
            >
              The nervous system of{' '}
              <span className="gold-text italic">innovation</span>.
            </h1>
            <p className="mny-rise mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base" style={{ animationDelay: '160ms' }}>
              A place where enterprises, foundations, founders, inventors, researchers, mathematicians, teachers and the
              simply curious find each other — form communities, argue, build, and leave every session with a solid point
              on the table. Not a feed to scroll. A circle to join.
            </p>
            <div className="mny-rise mt-7 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '240ms' }}>
              <button
                onClick={() => go('onboarding')}
                className="mny-btn rounded-full px-7 py-3 text-sm font-semibold tracking-wide"
              >
                Begin indexing — get placed
              </button>
              <button
                onClick={() => go('pulse')}
                className="rounded-full border border-gold-600/25 bg-gold-400/5 px-6 py-3 text-sm text-gold-800 transition hover:bg-gold-400/12"
              >
                Walk straight in →
              </button>
            </div>
            <div className="mny-rise mt-6 flex flex-wrap items-center justify-center gap-2.5" style={{ animationDelay: '300ms' }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-600/25 bg-gold-400/[0.06] px-3.5 py-1.5 text-xs text-gold-800">
                <AliveDot />
                <span>
                  the circle is alive — {stats ? stats.members : '…'} indexed · {stats ? stats.communities : '…'} communities · {stats?.linkedWeb ?? '…'} nodes linked
                </span>
              </span>
            </div>
            <p className="mny-rise mt-4 text-xs leading-relaxed text-muted-foreground" style={{ animationDelay: '360ms' }}>
              Indexing takes two minutes. It exists so you sign into something already alive — not an empty room.
            </p>
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="mny-rise mt-3 text-sm font-medium text-gold-800 underline-offset-4 transition hover:underline"
              style={{ animationDelay: '400ms' }}
            >
              Sign in or create an account →
            </button>
          </div>
        </div>
        <DawnVeil />
      </section>

      {/* Narrow & portrait stages — the whole crest, lettering and all,
          edge to edge, flowing into the page below it. */}
      <div className="hero-stacked relative overflow-hidden">
        <div className="crest-breathe relative">
          <Image
            src="/brand/emblem-dawn.png"
            alt="The Manya emblem — two hands clasped inside a golden ring above the word MANYA and the motto Unify, Collaborate, Impact, over a mountain lake at sunrise"
            width={1254}
            height={1254}
            priority
            unoptimized
            className="block h-auto w-full"
          />
          <CrestAtmosphere />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-background" />
        <DawnVeil />
      </div>

      {/* ── The word, spoken on the ground the crest provides ────────────
          (narrow & portrait stages — on wide stages it stands beside the
          crest inside the hero above) */}
      <section className="hero-message-stacked relative mx-auto w-full max-w-3xl px-4 pb-16 pt-8 text-center sm:px-6 sm:pt-10">
        {/* the nervous system, breathing quietly under the word */}
        <NeuralCanvas density={0.5} className="-z-10" />
        <h1 className="mny-rise font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl" style={{ animationDelay: '80ms' }}>
          The nervous system of{' '}
          <span className="gold-text italic">innovation</span>.
        </h1>
        <p className="mny-rise mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: '160ms' }}>
          A place where enterprises, foundations, founders, inventors, researchers, mathematicians, teachers and the
          simply curious find each other — form communities, argue, build, and leave every session with a solid point
          on the table. Not a feed to scroll. A circle to join.
        </p>
        <div className="mny-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '240ms' }}>
          <button
            onClick={() => go('onboarding')}
            className="mny-btn rounded-full px-7 py-3 text-sm font-semibold tracking-wide"
          >
            Begin indexing — get placed
          </button>
          <button
            onClick={() => go('pulse')}
            className="rounded-full border border-gold-600/25 bg-gold-400/5 px-6 py-3 text-sm text-gold-800 transition hover:bg-gold-400/12"
          >
            Walk straight in →
          </button>
        </div>
        <div className="mny-rise mt-6 flex flex-wrap items-center justify-center gap-2.5" style={{ animationDelay: '300ms' }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-600/25 bg-gold-400/[0.06] px-3.5 py-1.5 text-xs text-gold-800">
            <AliveDot />
            <span>
              the circle is alive — {stats ? stats.members : '…'} indexed · {stats ? stats.communities : '…'} communities · {stats?.linkedWeb ?? '…'} nodes linked
            </span>
          </span>
        </div>
        <p className="mny-rise mt-4 max-w-md text-xs leading-relaxed text-muted-foreground" style={{ animationDelay: '360ms' }}>
          Indexing takes two minutes. It exists so you sign into something already alive — not an empty room.
        </p>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="mny-rise mt-3 text-sm font-medium text-gold-800 underline-offset-4 transition hover:underline"
          style={{ animationDelay: '400ms' }}
        >
          Sign in or create an account →
        </button>
      </section>

      <GoldRule className="mx-auto max-w-2xl" />

      {/* ── Who it is for ────────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <SectionHead eyebrow="Who resonates here" title="Every kind of mover, one circle">
          Founders seeking funding, funders seeking conviction, inventors at their benches, physicists defending
          hypotheses, mathematicians in the clouds, debaters sharpening the day&apos;s question, teachers calling their
          students, and explorers who just arrived to listen.
        </SectionHead>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ROLES.slice(0, 10).map((r, i) => (
            <div
              key={r.id}
              className="mny-rise mny-glass group rounded-2xl p-4 transition hover:border-gold-600/40 hover:shadow-[0_10px_28px_oklch(0.55_0.09_82/0.14)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-gold-400/10 text-lg text-gold-700 transition group-hover:bg-gold-400/20">
                {r.glyph}
              </div>
              <p className="text-sm font-medium leading-snug">{r.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What happens here ────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="mny-glass rounded-2xl p-6">
            <AliveDot tone="rose" />
            <h3 className="mt-3 font-display text-xl font-semibold">Debates, out loud</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A topic of the day gets a floor and a clock. Debaters take three minutes each; the question stays open
              until it is answered. Fun here has teeth — it is the fun of thinking in company.
            </p>
          </div>
          <div className="mny-glass rounded-2xl p-6">
            <AliveDot />
            <h3 className="mt-3 font-display text-xl font-semibold">Conclaves, not calls</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              From three people up: video or audio, a table rather than a stage. Text scatters the mind when a vision
              is trying to be seen — so founders, partners and teachers talk the way thinking actually happens.
            </p>
          </div>
          <div className="mny-glass rounded-2xl p-6">
            <AliveDot tone="champagne" />
            <h3 className="mt-3 font-display text-xl font-semibold">Solid points, every session</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A Conclave ends when the table has something to hold: decisions carried, numbers set, names attached.
              The session&apos;s solid point is written down before anyone stands up.
            </p>
          </div>
        </div>
      </section>

      {/* ── Reach vs Connect ─────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mny-glass mny-glow relative overflow-hidden rounded-3xl p-6 sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <SectionHead eyebrow="The distinction that rules everything" title="Reach is finding. Connection is permission.">
                Anyone can reach anyone here — search, discover, read, listen. But to connect — to enter someone&apos;s
                space, to sit with their intelligence, to link to their devices — requires the other side to say yes.
              </SectionHead>
              <button
                onClick={() => go('connect')}
                className="rounded-full border border-sapphire-400/35 bg-sapphire-500/10 px-5 py-2.5 text-sm text-sapphire-700 transition hover:bg-sapphire-500/20"
              >
                See how connection is granted →
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              {[
                ['Reach', 'You find a space, a founder, an intelligence, a device. No permission needed to look.'],
                ['Inquiry', 'You send a request for connection — a note saying who you are and why.'],
                ['Permission', 'They answer with what they hold: a passkey, a scan, or a 7-character code.'],
                ['Connected', 'Now you can speak, share, convene. The circle grows — by consent only.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3 rounded-xl border border-gold-600/10 bg-white/60 p-3.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-400/15 text-[11px] font-semibold text-gold-700">
                    {i + 1}
                  </span>
                  <span><span className="font-medium">{t}.</span> <span className="text-muted-foreground">{d}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── The circle is open — the ivory mint, whole ─────────────────── */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-gold-600/20">
          <Image
            src="/brand/emblem-ivory.png"
            alt="The Manya emblem on ivory — two hands clasped inside a golden ring above the word MANYA, the circle open"
            width={1240}
            height={1240}
            unoptimized
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: 'center 40%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/88 to-background/45" />
          <div className="relative flex flex-col items-center px-4 py-16 text-center sm:py-20">
            <p className="mny-caps text-gold-800">the circle is open</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Come as you are. Be placed where you <span className="gold-text italic">resonate</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/75">
              Two minutes of indexing, and the rooms will already know to expect you — people mid-discussion,
              tables already set, a seat with your name on it.
            </p>
            <button
              onClick={() => go('onboarding')}
              className="mny-btn mt-7 rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide"
            >
              Take your place in the circle →
            </button>
          </div>
        </div>
      </section>

      <Footer />
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onStartIndexing={() => go('onboarding')}
      />
    </div>
  )
}
