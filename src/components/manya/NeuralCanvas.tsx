'use client'

import { useEffect, useRef } from 'react'

// ─── NeuralCanvas — the gilded weave, breathing ──────────────────────────
// Drifting motes of gold; sparks fire between near neighbours, and every
// so often a sapphire gem glints. This is the living ground under Manya.

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
  pulse: number
}

export function NeuralCanvas({ density = 1, className = '' }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    let nodes: Node[] = []
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    const seed = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor(((w * h) / 26000) * density)
      nodes = Array.from({ length: Math.max(24, Math.min(110, count)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1.2 + Math.random() * 2.1,
        hue: Math.random() < 0.12 ? 222 : Math.random() < 0.25 ? 38 : 48,
        pulse: Math.random() * Math.PI * 2,
      }))
    }

    const LINK = 130

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      const t = performance.now() / 1000

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = w + 20
        if (n.x > w + 20) n.x = -20
        if (n.y < -20) n.y = h + 20
        if (n.y > h + 20) n.y = -20
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let k = i + 1; k < nodes.length; k++) {
          const b = nodes[k]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const near = 1 - Math.sqrt(d2) / LINK
            // a synapse occasionally fires along the link
            const firing = Math.sin(t * 1.4 + i * 2.7 + k * 1.3) > 0.985
            ctx.strokeStyle =
              firing
                ? `hsla(${a.hue}, 88%, 46%, ${0.8 * near})`
                : `hsla(${a.hue}, 72%, 44%, ${0.15 * near})`
            ctx.lineWidth = firing ? 1.6 : 0.7
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        const glow = 0.5 + 0.5 * Math.sin(t * 1.1 + n.pulse)
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + glow * 0.7, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${n.hue}, ${n.hue === 222 ? 72 : 82}%, ${n.hue === 222 ? 48 : 46}%, ${0.4 + glow * 0.35})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    seed()
    tick()
    const onResize = () => seed()
    window.addEventListener('resize', onResize)
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [density])

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
