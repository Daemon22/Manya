
## 2026-10-29 · Pivot: Manya UI surface (user directive)

User redirected Phase 2 focus: build the **Manya user interface** first — the
public-facing connective-tissue side. Key requirements captured verbatim from
user briefing and implemented as a Next.js SPA (this repo's scaffold):

- **Reach vs Connect distinction** — reach is discovery; connection is
  permission. Implemented in Connect Center (`/` → Connect view).
- **Permissioned connection** — request → approval via Aruk passkey modal
  (simulated ceremony, Aruk holds keys), QR scan, or 7-character code.
- **Pairing** — server-minted 7-char codes (unambiguous alphabet), real QR
  (`manya://connect?code=...`), rotate support, redeem-by-code flow.
- **Indexing (Resonance Index)** — 5-step questionnaire → computed placement
  (community), matches (incl. Foundation-owned intelligences), score.
- **Conclave** — group calls 3+ (WebRTC mesh over socket.io signaling on :3003,
  gateway XTransformPort routing verified end-to-end), simulated seats for the
  3-seat minimum, chat, and the **Solid Point** capture at session end.
- **Pulse feed** — intents (funding/support/partnership/talent/debate/aid),
  seeded living content, composer, echoes/support.
- **Communities** — 10 seeded rooms with purposes; detail view; convene action.
- **My Web** — same-owner devices/apps/spaces/intelligences seamless web;
  approved intelligence/device requests become linked nodes.
- **Siblings represented**: Aruk (keys), Lycon (browser), Manya-OS
  (intelligences) — external systems, not developed here.

Verified with agent-browser: indexing → resonance card → post → community →
conclave → solid point → passkey approval (AURORA-7 joins web) → pairing QR +
code redeem → mobile layout. Two bugs found & fixed: (1) decide() passkeyFor
guard blocked by-code/by-scan approvals; (2) StrictMode joinedRef guard killed
socket reconnect after cleanup. Lint clean.

Parked (pre-pivot plan): OS npm ci broken-deps fix, supabase backbone,
bridge contract alignment. Aruk/Lycon/Hawk remain external.

## 2026-10-29 — The Re-Minting: Manya public face dressed in the emblem (Session 4)

**User guidance:** three brand emblem images (gold ring + clasped hands + sapphire gems;
"UNIFY ✦ COLLABORATE ✦ IMPACT"). "From the quality, energy and vibrancy you can Craft a
worthy space." → Full visual re-mint of the Manya web app from "bio-electric emerald" to
the brand's own metal.

**New brand system ("The Gilded Circle")**
- Tokens: warm obsidian ground, royal gold (oklch 90 hue family), sapphire gem accent,
  ivory light, champagne warmth. All five tones shipped as Tailwind 4 @theme colors.
- Type: Cormorant Garamond display serif (`font-display`) over Geist body.
- Utilities: `.mny-glass` (obsidian glass + gold hairline), `.mny-glow`, `.gold-text`
  (sheen animation), `.mny-caps` (motto voice), `.mny-btn` (minted gold button),
  `.gold-hairline`, `.mny-orbit` (ceremonial rotation).

**Work executed (all in src/ of the Next.js app)**
- `public/brand/` — emblem-obsidian.png (black bg baked to alpha via
  `scripts/mint_emblem_alpha.py`), emblem-ivory.png, emblem-dawn.png; `public/emblem.svg`
  favicon (ring + gems + beads + clasp strokes).
- `Emblem.tsx` (NEW) — hand-forged SVG: double-struck gold ring, sapphire gems above and
  below, bead ornaments flanking, stylized clasped hands; plus `GoldRule` divider.
- `layout.tsx` — Cormorant Garamond + motto metadata + emblem favicon.
- `chrome.tsx` — EmblemMark brand, gold nav/active states, `accentTone()` mapper,
  siblings renamed Lycon (browser), ✦-prefixed eyebrows, serif SectionHead.
- `constants.ts` — tone system gold/champagne/sapphire/ivory/rose with legacy aliases;
  INTENTS re-toned (funding=champagne, partnership=sapphire, talent=ivory...).
- `NeuralCanvas.tsx` — "gilded weave": gold motes (HSL 48/38), sapphire sparks (222).
- `Landing.tsx` — hero: emblem medallion (alpha-floated, drop-shadow, rotating 4-gem halo
  SVG), motto eyebrow, serif display w/ gold-text "innovation"; roles grid, three panels,
  Reach-vs-Connect (sapphire "permission"), dawn-horizon closing CTA (emblem-dawn.png).
- `Onboarding.tsx` — gilded 5-step indexing; Resonance Card: serif headline, gold score.
- `Pulse/Communities/Conclave/CallRoom/Connect/PasskeyModal/MyWeb` — full re-mint;
  Aruk = champagne keeper, connect codes gold mono, intelligence = ivory badge.
- `seed.ts` — community accents re-minted; DB wiped + re-pushed + reseeded.

**Incidents fixed during session**
- MultiEdit partial-application interleaving mangled Communities.tsx (unclosed SectionHead)
  → full clean rewrite.
- POST /api/members 500 "attempt to write a readonly database" — running Prisma engine
  held the deleted DB inode after `rm db/custom.db` → restarted dev server via
  `.zscripts/dev.sh`; write path verified (probe member created then removed).

**Verification (Agent Browser, all green)**
- Landing → onboarding (founder/partnership+funding/business+software/voice) → placed at
  Founders' Forge, resonance 99 → Pulse → Communities → Forge detail → Conclave → room
  (WebRTC chamber, simulated seats) → Connect → passkey ceremony APPROVED AURORA-7 →
  pairing QR + 7-char code → MyWeb → mobile 375px.
- `bun run lint` clean; dev.log 0 errors; browser console clean (only LCP hint on dawn
  image, cosmetic).

**Open (unchanged from roadmap):** Manya-OS npm-ci 404 repair (missing pkgs), supabase
backbone into HTTP runtime, federated bridge contracts (now visually specified: passkey /
QR / 7-char approval flow exists as UI truth in Connect).

## 2026-10-29 — Session 5: worthy-space re-verification + OS unblocked + connection contract

**Worthy-space QA (quality / energy / vibrancy).** Fresh agent-browser pass over the
re-minted app: landing (emblem medallion, gilded weave, liveness pill), full 5-step
indexing walk (founder → partnership → business+software → voice → placed at Founders'
Forge, resonance 95/99, "34 alive there now", Loom intelligence among matches), Pulse
(alive-now sidebar, intent feed, keeper log). Console + page errors clean. One defect
found & fixed: resonance-card grammar ("where partnership are already moving" →
"already alive with …") in `src/lib/resonance.ts`. `bun run lint` clean.

**Manya-OS install blocker: RETIRED.** `npm ci` now succeeds (474 pkgs, workspace
symlinks for all @manya-os/* — lockfile had been regenerated vs pristine; md5 differs).
Root suite: **2151 passed / 0 failed** (was 1318 at baseline), typecheck clean.

**Manya-main re-verified + repaired.** `npm ci` restored missing node_modules; vitest
670/670 green. The four session packages' `node --test test/` scripts were broken on
Node 24 (bare dir arg no longer supported) → patched to `node --test "test/*.test.js"`:
core-runtime 5, transport 17, knowledge 14, foundation 10 — all green.

**Federated bridge contract aligned with the Connect UI truth.** `@manya-os/bridge`
(now actually tested — jest's TS-only match never ran bridge.test.mjs; fixed its
Node-24 script too):
- New exports: `CONNECTION_METHODS` (INQUIRY|QR|CODE|PASSKEY), `CONNECTION_TOPICS`
  (connection.request/grant/revoke), `CODE_ALPHABET` + `mintPairingCode()` +
  `isValidPairingCode()` (mirror Manya's generateCode verbatim),
  `createConnectionRequest/Grant/Revoke` (fabric events, contract 'connection/1').
- Grants are strict on the bridge: only known methods enqueue (CODE requires a real
  7-char code); malformed grants remain fabric observations, never consent.
- nervous-system `CollaborationRequestEvent.requestType` extended with 'grant'/'revoke'.
- Tests 6 → 8, incl. full wire round-trip (request → CODE grant → forged-grant
  rejection → revoke). Bridge 8/8 green.

**State:** dual-repo green (OS 2151 + bridge 8; Manya 670 + 46). Open: supabase
backbone into HTTP runtime; wiring the OS queue to Manya's live Connect APIs.

## 2026-10-29 — Session 6: The Daybreak (user feedback: "too dark — use the realistic one")

**User guidance:** the obsidian ground is too dark; use the *realistic* brand image —
"the view of that lake can be very calming, sun inspiring." → Re-grounded the whole
public face on the dawn-valley landscape (mountains, lake, sun) with the gold metals kept.

**Token flip (globals.css) — "daybreak on the circle"**
- `--background` warm obsidian → dawn ivory; `--foreground` → warm bronze ink; card/
  popover/muted/border/ring re-tuned for light.
- Palette extended with deep stops for readable text on ivory: sapphire-700/800,
  champagne-600/700, ivory-500..800 (warm greys).
- `.mny-glass` obsidian glass → ivory glass w/ gold-brown hairline; `.mny-glow`,
  `.mny-btn`, `.gold-hairline`, scrollbars re-balanced; `.gold-text` deepened so the
  sheen reads on light.
- NEW `.mny-valley`: the realistic landscape (public/brand/valley.png, minted from the
  user's 3.png via scripts/mint_valley_backdrop.py — blur σ9 so the baked-in wordmark
  dissolves while lake/mountains/sun stay readable) behind a warm veil that lets the
  sky breathe most at the top. Mounted fixed in layout.tsx.

**Component sweep** — TONE_CLASSES re-tuned (deep text, /12 washes); chrome/Landing/
Onboarding/Pulse/Communities/Conclave/Connect/MyWeb/PasskeyModal: light-gold text →
gold-700/800, borders → gold-600, white-on-dark washes → frosted white / warm gold
hovers; hero radial → sun wash; halo + medallion shadows deepened; NeuralCanvas motes
now deep-gold/sapphire ink on light. Closing CTA veil strengthened
(via-/90 to-/55) so the headline reads over the landscape. CallRoom intentionally
stays a dark chamber (video room); Connect QR panel stays white (scan reliability).

**Verified (agent-browser, all green):** landing top/mid/deep, full indexing walk
(founder → partnership → business+software → voice → Daybreak → placed, resonance 95/99),
Pulse, Connect (requests + passkey buttons + ledger), closing CTA, mobile 375px.
`bun run lint` clean; console clean.

## 2026-10-29 — The Valley Dawn: from obsidian ground to the living lake (user directive)

**User:** "its a bit too dark… use the realistic one. Instead of a black background, the
view of that lake can be very calming, sun inspiring." → Finish the light pivot the lost
session had begun (tokens/layout/chrome/Landing were already flipped at 18:46–18:50 Oct 28
but never completed or recorded).

**Finished in this session**
- Dark-era leftovers purged across 9 components (CallRoom 14 fixes, Pulse 8, Connect 7,
  Conclave 4, Onboarding 5, MyWeb/Communities/Landing/PasskeyModal): `border-white/10` →
  gold hairlines, `bg-white/5` → frosted `bg-white/60–70`, rose chips re-toned for light
  (rose-500/700), CallRoom chamber now `bg-background/90` with deep-slate video tiles and
  white text on video pills.
- Four `bg-white/605` typos fixed (invalid Tailwind class → panels had no fill).
- `public/brand/valley.png` REPLACED: was a blurred copy of emblem poster 3.png (ghost
  wordmark behind every page); now a generated photorealistic alpine valley — turquoise
  lake, snow-capped mountains, sun rays upper right, foliage framing — no text/logo.
- Veil tuned for the new scene (0.24 top → 0.62 → 0.82 → 0.90 bottom); `gold-text` depths
  lowered for contrast on the dawn ground.

**Verified (agent-browser):** landing hero + roles grid over the valley, full indexing
walk → resonance (95/99, "already alive with partnership"), Pulse, Forge detail, Conclave
floor → live room (light chamber, readable pills), passkey ceremony → approved → pairing
QR + gold code HXJPMWU, MyWeb (AURORA-7 linked via PASSKEY), mobile 375px. Lint clean;
console/page errors clean; dev.log clean.

**State:** dual-repo green unchanged (OS 2151 + bridge 8; Manya 670 + 46). Open:
supabase backbone into HTTP runtime; OS queue ↔ live Connect APIs.

## Session 6 — the picture restored, the mint set right (2026-10-29)

**User directive (verbatim):** "Please do not ruin my picture for me … those hands look
like they are taken from cartoons, while the picture that I gave you was clean, was of
perfect quality … on the last one, the one on joining the circle, the logo displayed
there, you can change it to the ones I told you to not use as the overall design — the
black and white ones … choose the one that will suit the design best. Then on the overall
design, leave this design."

**Root cause found:** `public/brand/emblem-obsidian.png` was NOT the user's original — it
was a background-removed derivative (RGBA): 76.5% of pixels fully transparent, and inside
the hands region 30.1% fully transparent + 11.5% semi-transparent, so the light valley
ground bled through the dark hands → the pale "cartoon" look on the landing hero.

**Fixes:**
- `emblem-obsidian.png` restored to the EXACT original `upload/2.png` (md5
  603352d0… matches; script `scripts/restore_emblem.py`). No pixel alteration anywhere —
  the picture is only framed.
- Landing hero: the original shown whole as an obsidian plaque — rounded-[2.25rem],
  gold hairline ring (`ring-gold-600/40`), deep ambient shadow; halo orbit widened to
  128% @ opacity-50; redundant caps motto line removed (the picture carries
  "UNITY ✦ COLLABORATION ✦ IMPACT" itself).
- Final "the circle is open" CTA: logo swapped `emblem-dawn.png` (lake poster) →
  `emblem-ivory.png` (the user's ivory/white original, byte-exact `upload/1.png`); veil
  lightened (via-background/88, to-background/45), object-position center 40% so the
  emblem band reads cleanly with no truncated wordmark letters. Ivory chosen over black:
  it melts into the dawn-ivory ground and keeps the page calm; the black plaque already
  anchors the hero. One-line swap to black if the user prefers.
- Nav EmblemMark SVG and favicon left untouched (not in scope; read as abstract marks at
  their sizes).

**Verified (agent-browser):** landing hero (desktop + mobile 390px), full 5-step indexing
walk → resonance card (99/99, correct grammar), the circle-is-open card, Pulse. Zero
console messages, zero page errors; `bun run lint` clean. Test baselines untouched.

**Session 6b — hero picture substituted (user directive: "remove the black logo and
substitute it with this one. ONLY THE BLACK LOGO"):**
- Landing hero: `emblem-obsidian.png` (black plaque) → `emblem-dawn.png` — the user's
  sunrise/lake original (uploaded 3.png verified byte-identical, md5 8c5dc11f…). Shown
  whole in the same framed treatment (rounded 2.25rem, gold hairline, ambient shadow,
  halo orbit); alt text updated to the sunrise scene. Shadow softened for the bright
  picture (0.34/0.20 alpha, inset highlight 0.35).
- ONLY the hero changed: closing "the circle is open" card keeps the ivory emblem
  (`emblem-ivory.png`); valley ground, nav, favicon untouched. `emblem-obsidian.png`
  remains on disk (unused) as the preserved black original.
- Verified: desktop + mobile hero, CTA card unchanged, zero page errors, lint clean.

**Session 7 — the dawn becomes the ground (user creative direction: "make the beauty of
the original image the beauty of the website"; the artwork is the foundation, not a logo
in a card; remove the blur/wash; keep everything else intact):**
- Landing hero rebuilt as "the voice above, the world below":
  - The minted dawn (`emblem-dawn.png`, byte-exact `upload/3.png`, md5 8c5dc11f…) is let
    out of its 380px card and shown WHOLE, edge to edge, at native aspect
    (`w-full h-auto`, `sizes="100vw"`, max-w-[1920px]) — zero crop, zero stretch,
    zero blur, zero veil. Sky, clouds, sun, mountains, lake, golden ring, handshake,
    MANYA wordmark and motto all render sharp; the ring alone spans ~56% of viewport
    height on desktop.
  - The site's voice (h1, sub, both CTAs, alive-stats pill, indexing note — all existing
    copy preserved) sits in a compact band above the artwork on clean dawn ivory, so no
    text ever covers the emblem; on mobile the fold shows the message plus the
    handshake already rising.
  - Only treatment on the picture: an 8%-tall gradient at the waterline (below the
    motto) easing the deep water into the page ground — localized, not a wash.
- Washed-out stand-in ground removed: `layout.tsx` fixed `.mny-valley` div and the
  `.mny-valley` CSS block deleted (valley.png — a different landscape under a 24–90%
  ivory veil — was the "blurred, washed out" background the user flagged). Lower
  sections now sit on the calm dawn-ivory ground; `valley.png` file kept on disk,
  unreferenced. NeuralCanvas removed from the hero (image supplies the beauty);
  component kept for other surfaces.
- Untouched: "the circle is open" ivory CTA card, nav EmblemMark, favicon, all routes,
  copy, and the design system (glass, gold, mny-* language).
- Verified (agent-browser): desktop 1440×900 fold + full-page, emblem/wordmark/waterline
  scroll-through, mobile 390×844 (fold, emblem, lower), "Walk straight in" → Pulse with
  TopNav intact; zero console errors, zero page errors; `bun run lint` clean;
  artwork md5 unchanged after all edits.

**Session 7b — regression corrected (user directive: restore the layered hero — sharp
landscape background + clear framed logo — NOT a giant square mural):**
- Reverted the Session 7 mural. Hero restored to the layered composition:
  - Layer 1: `valley.png` (the separate landscape asset, per "if a separate landscape
    asset already exists, use that instead") as the hero section's own background —
    `absolute inset-0`, `object-cover`, `objectPosition center 40%`, NO blur and NO
    page-wide pale veil. Mountains, blue sky, clouds, sunburst, trees and water
    (ripples + reflections) all render sharp.
  - Layer 2: the medallion — `emblem-dawn.png` whole in its frame (rounded-[2.25rem],
    gold hairline ring, soft ambient shadow, halo orbit) floating top-center, exactly
    as in Session 6b.
  - Original positions restored verbatim: h1 → sub → both CTAs → alive pill → note,
    same spacing/animation delays; NeuralCanvas (density 1.15) and the top gold glow
    restored; NeuralCanvas import back.
- Readability, localized only (per "restrained treatment behind the relevant text"):
  - lg+: radial light pool behind the centered text column
    (ellipse 62%×48% at 50% 64%, ivory 0.78→0.34→transparent).
  - Below lg: vertical "morning mist" over the lower text half
    (transparent 30% → ivory 0.35/46% → 0.62/63% → 0.86/80% → background 100%),
    because the radial pool's x-radius is narrower than the text at tablet widths.
  - Bottom 112px blend to background so the hero eases into the ivory sections.
- Untouched: lower sections, ivory CTA card, nav, favicon, routing, copy, design system.
- Verified (agent-browser): 390×844, 768×1024, 1024×768, 1440×900, 1920×1080 — scenery
  sharp everywhere, emblem crisp, all text readable, hero→sections seam smooth; zero
  console/page errors; `bun run lint` clean; `emblem-dawn.png` still byte-identical to
  `upload/3.png` (md5 8c5dc11f…).
