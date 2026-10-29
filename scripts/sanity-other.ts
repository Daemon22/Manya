// Sanity: free-text "Other" answers must be heard by the Resonance Index.
import { computeResonance } from '../src/lib/resonance'
import type { Community } from '../src/lib/types'

const communities = [
  { id: '0', slug: 'founders-forge', name: 'The Founders’ Forge', tagline: 'Where ventures catch fire', purpose: 'Founders, funders and early markets', domain: 'business', accent: 'gold', kind: 'arena', memberCount: 20, aliveNow: 5 },
  { id: '1', slug: 'engineering-guild', name: 'The Engineering Guild', tagline: 'Hands on the machine', purpose: 'Prototypes, sensors and low-cost water tools', domain: 'engineering', accent: 'gold', kind: 'guild', memberCount: 12, aliveNow: 3 },
  { id: '2', slug: 'form-and-color', name: 'Form & Color', tagline: 'Where design breathes', purpose: 'Critique circles for poets, painters and storytellers', domain: 'arts', accent: 'rose', kind: 'circle', memberCount: 8, aliveNow: 2 },
] as Community[]

// 1. Pure "Other" — no taxonomy pick at all. Must still place + headline from their words.
const r1 = computeResonance(
  { name: 'Test A', roles: ['custom:poet of circuits and oral archives'], seeking: ['custom:sparring partners for a wild theory'], domains: ['custom:ocean sensor networks and storytelling'], style: 'custom:custom:when I pace and draw maps', purpose: '' },
  communities,
)
console.log('1. headline:', r1.headline)
console.log('   placement:', r1.placementName, '| score:', r1.score)
console.log('   summary:', r1.summary)

// 2. Mixed — taxonomy + Other. Custom words must shift placement.
const r2 = computeResonance(
  { name: 'Test B', roles: ['founder', 'custom:poet'], seeking: ['support'], domains: ['custom:poetry, painting and film'], style: 'text-first', purpose: '' },
  communities,
)
console.log('2. headline:', r2.headline)
console.log('   placement:', r2.placementName, '(expect Form & Color — poetry/painting/film pull arts)')
console.log('   summary:', r2.summary)

// 3. Plain taxonomy path must be unchanged.
const r3 = computeResonance(
  { name: 'Test C', roles: ['founder'], seeking: ['funding'], domains: ['business'], style: 'both', purpose: 'Building markets' },
  communities,
)
console.log('3. headline:', r3.headline, '| placement:', r3.placementName, '(expect founders-forge / Founder in motion)')
