'use client'

import { cn } from '@/lib/utils'

// ─── The Emblem of Manya ─────────────────────────────────────────────────
// A hand-forged rendering of the brand mark: the golden ring, the sapphire
// gems set above and below, the bead ornaments at the flanks, and the
// clasped hands of two people at the center — unity, collaboration, impact.

export function Emblem({ size = 96, className, glow = false }: {
  size?: number
  className?: string
  glow?: boolean
}) {
  const showHands = size >= 64
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 18px oklch(0.8 0.12 90 / 0.35))' } : undefined}
    >
      <defs>
        <linearGradient id="mny-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E3A2" />
          <stop offset="0.3" stopColor="#E8C96A" />
          <stop offset="0.55" stopColor="#B08A2E" />
          <stop offset="0.8" stopColor="#E3C56C" />
          <stop offset="1" stopColor="#8F6E27" />
        </linearGradient>
        <linearGradient id="mny-ring2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8C96A" />
          <stop offset="0.5" stopColor="#8F6E27" />
          <stop offset="1" stopColor="#F1D98E" />
        </linearGradient>
        <linearGradient id="mny-gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9CC2FA" />
          <stop offset="0.45" stopColor="#3D7BE8" />
          <stop offset="1" stopColor="#1B3F97" />
        </linearGradient>
        <radialGradient id="mny-bead" cx="0.35" cy="0.3" r="1">
          <stop offset="0" stopColor="#F8E9AE" />
          <stop offset="0.6" stopColor="#D9B95C" />
          <stop offset="1" stopColor="#8F6E27" />
        </radialGradient>
        <linearGradient id="mny-bronze" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6E4426" />
          <stop offset="1" stopColor="#9C6438" />
        </linearGradient>
        <linearGradient id="mny-cream" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#E9CFA0" />
          <stop offset="1" stopColor="#D2A96C" />
        </linearGradient>
      </defs>

      {/* the ring — double-struck gold */}
      <circle cx="100" cy="100" r="74" stroke="url(#mny-ring)" strokeWidth="7" />
      <circle cx="100" cy="100" r="66.5" stroke="url(#mny-ring2)" strokeWidth="1.6" opacity="0.75" />

      {/* the gems, set above and below */}
      <g>
        <path d="M100 2 L114 17 L100 32 L86 17 Z" fill="url(#mny-gem)" stroke="#D9B95C" strokeWidth="2" />
        <path d="M100 2 L100 32 M86 17 L114 17" stroke="#CFE4FF" strokeWidth="1" opacity="0.85" />
      </g>
      <g>
        <path d="M100 168 L114 183 L100 198 L86 183 Z" fill="url(#mny-gem)" stroke="#D9B95C" strokeWidth="2" />
        <path d="M100 168 L100 198 M86 183 L114 183" stroke="#CFE4FF" strokeWidth="1" opacity="0.85" />
      </g>

      {/* the bead ornaments, flanking left and right */}
      <g fill="url(#mny-bead)">
        <circle cx="26" cy="100" r="8.5" />
        <circle cx="11.5" cy="100" r="4" />
        <circle cx="2.8" cy="100" r="2.2" />
        <circle cx="174" cy="100" r="8.5" />
        <circle cx="188.5" cy="100" r="4" />
        <circle cx="197.2" cy="100" r="2.2" />
      </g>

      {showHands && (
        <g>
          {/* left forearm — bronze */}
          <path
            d="M46 124 C 60 111, 74 104.5, 89 103.5"
            stroke="url(#mny-bronze)"
            strokeWidth="17"
            strokeLinecap="round"
            fill="none"
          />
          {/* right forearm — cream */}
          <path
            d="M154 122 C 140 109, 126 102.5, 111 101.5"
            stroke="url(#mny-cream)"
            strokeWidth="17"
            strokeLinecap="round"
            fill="none"
          />
          {/* left hand, palm under */}
          <rect x="82" y="93" width="36" height="19" rx="9.5" transform="rotate(-14 100 102.5)" fill="url(#mny-bronze)" />
          {/* right hand, gripping over */}
          <rect x="88" y="88" width="36" height="19" rx="9.5" transform="rotate(9 106 97.5)" fill="url(#mny-cream)" />
          {/* fingers of the right hand wrapping over the left forearm */}
          <g fill="#EFD3A0">
            <rect x="92" y="95" width="6" height="13.5" rx="3" transform="rotate(9 95 101.7)" />
            <rect x="100.5" y="94" width="6" height="14.5" rx="3" transform="rotate(6 103.5 101.2)" />
            <rect x="109" y="93.5" width="6" height="14.5" rx="3" transform="rotate(3 112 100.7)" />
            <rect x="117.5" y="94" width="5.5" height="13.5" rx="2.75" transform="rotate(0 120.2 100.7)" />
          </g>
          {/* thumb of the left hand over the right palm */}
          <path
            d="M84 96 C 88 90.5, 94 88.5, 99 90"
            stroke="url(#mny-bronze)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
    </svg>
  )
}

/** The compact mark — ring, gems and beads; sized for the nav and lists. */
export function EmblemMark({ size = 30, className }: { size?: number; className?: string }) {
  return <Emblem size={size} className={className} />
}

/** The gilded hairline with a sapphire gem at its heart — a section divider. */
export function GoldRule({ className, width = '100%' }: { className?: string; width?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width }} aria-hidden="true">
      <div className="gold-hairline w-full" />
      <svg width="12" height="12" viewBox="0 0 12 12" className="absolute">
        <path d="M6 0.5 L11 6 L6 11.5 L1 6 Z" fill="url(#rule-gem)" stroke="#D9B95C" strokeWidth="0.8" />
        <defs>
          <linearGradient id="rule-gem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9CC2FA" />
            <stop offset="1" stopColor="#1E4FB4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
