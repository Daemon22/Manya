'use client'

import { useEffect, useRef } from 'react'

// ─── The living dawn ─────────────────────────────────────────────────────
// Pure, additive light laid over the minted crest — nothing blurs it,
// nothing covers it, nothing repaints it. The sun's glow breathes; its
// rays sway across the valley; the lake glints; the set gems catch a
// passing sparkle; gold dust drifts on the morning air. Every layer is
// screen-blended light or a pre-dawn veil that fully lifts, so the crest
// beneath stays exactly as minted — every single pixel of it.
//
// All positions and sizes are percentages of the crest's own box, so the
// light stays registered on the real sun, gems and water at any screen
// size, in both hero stagings — full-bleed or standing beside the word.

const SPARKS = [
  { x: 50.0, y: 9.0, size: 2.6, delay: '2.2s', dur: '9.5s' }, // the crown gem
  { x: 50.0, y: 54.9, size: 2.6, delay: '5.1s', dur: '11s' }, // the gem at the ring's base
  { x: 24.7, y: 34.0, size: 1.6, delay: '7.4s', dur: '12.5s' }, // western bead
  { x: 71.7, y: 34.0, size: 1.6, delay: '0.9s', dur: '10.5s' }, // eastern bead
]

const STREAKS = [
  { top: '3%', h: 2, dur: '8.5s', del: '0s' },
  { top: '10.6%', h: 2, dur: '11s', del: '1.8s' },
  { top: '20.2%', h: 3, dur: '9.5s', del: '3.4s' },
  { top: '31.9%', h: 2, dur: '12.5s', del: '0.7s' },
  { top: '46.8%', h: 3, dur: '10.5s', del: '2.6s' },
  { top: '66%', h: 2, dur: '13.5s', del: '4.5s' },
]

const MOTES = [
  { l: 6, t: 18, s: 0.34, dur: '13s', del: '-2s', dx: 14, dy: -34 },
  { l: 14, t: 64, s: 0.26, dur: '16s', del: '-6s', dx: -10, dy: -30 },
  { l: 22, t: 38, s: 0.2, dur: '11s', del: '-4s', dx: 8, dy: -22 },
  { l: 30, t: 76, s: 0.42, dur: '14s', del: '-9s', dx: 16, dy: -40 },
  { l: 37, t: 24, s: 0.24, dur: '12s', del: '-1s', dx: -8, dy: -26 },
  { l: 45, t: 56, s: 0.3, dur: '15s', del: '-7s', dx: 12, dy: -30 },
  { l: 52, t: 12, s: 0.2, dur: '10s', del: '-3s', dx: -12, dy: -18 },
  { l: 58, t: 70, s: 0.36, dur: '17s', del: '-11s', dx: 18, dy: -38 },
  { l: 64, t: 32, s: 0.22, dur: '12.5s', del: '-5s', dx: -14, dy: -24 },
  { l: 71, t: 82, s: 0.44, dur: '15.5s', del: '-8s', dx: 10, dy: -44 },
  { l: 77, t: 44, s: 0.26, dur: '11.5s', del: '-2.5s', dx: -16, dy: -28 },
  { l: 83, t: 66, s: 0.32, dur: '14.5s', del: '-10s', dx: 14, dy: -36 },
  { l: 88, t: 20, s: 0.2, dur: '12s', del: '-6.5s', dx: -10, dy: -20 },
  { l: 92, t: 52, s: 0.3, dur: '16.5s', del: '-12s', dx: 12, dy: -32 },
  { l: 96, t: 74, s: 0.24, dur: '13.5s', del: '-4s', dx: -14, dy: -30 },
  { l: 10, t: 8, s: 0.22, dur: '12s', del: '-8s', dx: 10, dy: -16 },
  { l: 48, t: 88, s: 0.3, dur: '16s', del: '-13s', dx: 12, dy: -42 },
  { l: 68, t: 6, s: 0.22, dur: '11s', del: '-9.5s', dx: -8, dy: -14 },
  { l: 40, t: 44, s: 0.26, dur: '14s', del: '-5.5s', dx: -12, dy: -30, sapp: true },
  { l: 86, t: 36, s: 0.22, dur: '13s', del: '-7.5s', dx: 10, dy: -26, sapp: true },
]

export function CrestAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* the sun, breathing light */}
      <div className="mny-bloom" />
      {/* rays swaying across the valley */}
      <div className="mny-rays" />
      {/* the lake, glinting */}
      <div className="mny-shimmer">
        {STREAKS.map((s, i) => (
          <div
            key={i}
            className="mny-streak"
            style={{ top: s.top, '--h': `${s.h}px`, '--dur': s.dur, '--del': s.del } as React.CSSProperties}
          />
        ))}
      </div>
      {/* the set gems, catching the light */}
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="mny-spark"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `max(10px, ${s.size}%)`,
            height: `max(10px, ${s.size}%)`,
            '--sdur': s.dur,
            '--sdel': s.delay,
          } as React.CSSProperties}
        >
          <path
            d="M12 0c.9 7.2 1.7 8.6 12 12-10.3 3.4-11.1 4.8-12 12-.9-7.2-1.7-8.6-12-12C10.3 8.6 11.1 7.2 12 0Z"
            fill="oklch(0.985 0.03 98)"
          />
        </svg>
      ))}
      {/* gold dust on the morning air */}
      {MOTES.map((m, i) => (
        <span
          key={i}
          className={`mny-mote${m.sapp ? ' mny-mote--sapp' : ''}`}
          style={{
            left: `${m.l}%`,
            top: `${m.t}%`,
            width: `max(3px, ${m.s}%)`,
            height: `max(3px, ${m.s}%)`,
            '--dur': m.dur,
            '--del': m.del,
            '--dx': `${m.dx}px`,
            '--dy': `${m.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// Your attention, a lamp — a whisper of light follows the hand across the
// scene. Additive light only; never a wash. Rests on touch devices.
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
        el.style.opacity = '1'
      })
    }
    const leave = () => {
      el.style.opacity = '0'
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={ref} aria-hidden="true" className="mny-cursorlight" />
}

// Pre-dawn veil — the scene rises into full light, then is entirely gone.
export function DawnVeil() {
  return <div aria-hidden="true" className="mny-veil" />
}
