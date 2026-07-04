# Manya

Manya means *unite* or *connect*. This monorepo lives up to that name: it provides data encoding, encryption, compression, access control, secure messaging, compliance tooling, sector-specific validation, transport-logistics identifier validation, research-academic citation and reproducibility tooling, cybersecurity threat intelligence, **Manya Unify** (the connective tissue), the **Manya CLI** for shell access, **Manya Serve** for HTTP/REST/SSE access, **Manya Repl** for interactive exploration, and now **Lycon Browser** — a privacy-first web browser wired into the ecosystem.

> Everything Connected. Everyone Unified. Browse wild. Browse free.

## Ecosystem

Manya is one branch of the HAEL Foundation ecosystem — segregated repositories, each independent and independently maintained, that reference and reinforce each other rather than share a single codebase:

- **[Manya](https://github.com/Daemon22/Manya)** (this repo) — the public face and connective hub: tools, packages, and Lycon Browser.
- **[MANYA Intelligence OS](https://github.com/manya-hael/intelligence-os)** — a sibling platform sharing the Manya name, with its own standalone identity/memory/reasoning packages (not merged here — see [NOTICE](NOTICE) for the 6 packages that were).
- **[Gqobonco](https://github.com/Daemon22/Gqobonco)** — the Supreme Prince of Research, Intelligence & Information: research initiatives, the Xhosa NLP Database, and ancestral-knowledge preservation.
- **[OMNIMIND](https://github.com/Daemon22/OMNIMIND)** — the Supreme Intelligence Core.
- **[Orren](https://github.com/Daemon22/Orren)** — the Universal Mediator Language.

Each repo stays independently buildable and testable; none depend on another at the code level today.

## Repository Structure

| Directory | Description |
|-----------|-------------|
| `site/manya` | Main website + `/manya-live.html` (event-bus dashboard) + `/manya-weave-live.html` (live visualization) |
| `tools/` | Deployable tools and product workspaces |
| `packages/` | Publishable shared libraries and SDKs |
| `models/` | Reserved for model assets, adapters, and release notes |

## Tools

| Tool | Description | Industries |
|------|-------------|------------|
| **uSINGA - API NEXUS** | API provider wallet and smart routing | All |
| **HelixFlow** | Visual workflow DAG orchestration | All |
| **Hawk** | Device detection and environment monitoring | All |
| **Craft Engine** | 7-fold compression and encryption engine | All |
| **Forge** | Key derivation, passphrase strength, and hashing | All |
| **Stamp** | Tamper-proof timestamping, provenance chains, and audit trails | Legal, Finance, Healthcare, Government, Supply Chain |
| **Vault** | Encrypted key-value store for secrets, config, and credentials | DevOps, Finance, Healthcare, IoT |
| **Lens** | Data format detection, PII/PHI redaction, and sensitivity classification | Healthcare (PHI), Finance (PII), Legal, Data Pipelines |
| **Shield** | RBAC/ABAC access control engine with audit logging | Healthcare (HIPAA), Finance (SOX), Government (Clearance), SaaS |
| **Signal** | Secure encrypted message envelopes with cryptographic signatures | Healthcare comms, Finance signals, IoT commands, Team messaging |
| **Pulse** | Industry presets composing Lens, Shield, Stamp, Vault, and Signal for 10 industries | All industries |
| **Primary Sector** | Agriculture, Mining, Forestry, Fishing validation, compliance, and production reporting | Agriculture, Mining, Forestry, Fishing |
| **Cybersecurity** | Threat intelligence, CVSS vulnerability assessment, security compliance, digital forensics, and incident response | All industries with security operations |
| **Transport & Logistics** | Waybill, IMO, ISO 6346, UIC, flight, HS, TIR validation; shipment tracking with geofencing and ETA; customs declarations; dangerous-goods (IMDG/IATA-DGR/ADR/RID); sanctions screening | Aviation, Maritime, Road, Rail, Multimodal |
| **Research & Academic** | Citation validation (DOI, ORCID, arXiv, PMID, NCT, ROR, ISBN-13); reproducibility manifests with FAIR assessment; peer-review lifecycle and integrity verification; DMP templates | Life Sciences, Physical Sciences, Social Sciences, Computational Sciences |
| **Manya Unify** | Connective tissue: federates identities across tools, routes events through declared sync channels, bridges vocabularies, and dispatches capability-based calls to the owning tool | All |
| **Lycon Browser** | Privacy-first web browser with ad/tracker blocking (Lycon Shields), multi-tab browsing, bookmarks, history, downloads, and private mode. Browser events flow into Manya's event bus on `lycon:*` sync channels, and browser profiles can be linked to Manya federated identities. Built on Electron (desktop), WinUI 3 + WebView2 (Windows), and Kotlin + GeckoView (Android) — three platforms, one shared UI bundle. | All |
| **Manya CLI** | Command-line interface: `manya mesh/identity/bus/translate/weave/serve/repl/browse` | All |

## Packages

All packages are MIT licensed unless noted otherwise. See [NOTICE](NOTICE) for details on the Apache-2.0 packages.

| Package | Description | License |
|---------|-------------|---------|
| `@manya/toolkit` | Shared manifests, capability boundaries, and synchronization contracts for all 16 tools | MIT |
| `@manya/helixflow-sdk` | HelixFlow client and workflow helpers | MIT |
| `@manya/craft-engine` | 7-fold compression, encryption, archiving, and CLI | MIT |
| `@manya/unify` | Connective tissue: mesh, federation, event bus, vocabularies | MIT |
| `@manya/cli` | Command-line interface, HTTP server, and interactive REPL | MIT |
| `@manya/lycon` | Lycon browser Manya integration layer (adapter, event factories, manifest) | MIT |
| `@manya/keyring` | Sovereign identity wallet — composed from vault, forge, signal, shield | MIT |
| `@manya/attest` | Device/session attestation — composed from hawk, signal, shield | MIT |
| `@manya/ledger` | Tamper-evident audit ledger — composed from stamp, unify | MIT |
| `@manya/anonymize` | Redaction + reproducibility pipeline — composed from lens, research-academic | MIT |
| `@manya/memory` | Working/episodic/semantic/procedural/archival memory engine — composed from vault, stamp, unify | MIT |
| `@manya/cortex` | Capability-based task routing and decision auditing — composed from memory, unify, shield, stamp | MIT |
| `@manya/perception` | Redacted ingestion of text/structured/environment signals into working memory — composed from memory, lens, hawk | MIT |
| `@manya/telepathy` | Signed inter-agent messaging — composed from keyring, memory, unify | MIT |
| `@manya/reflection` | Plan critique and failure-driven replanning — composed from memory, cortex | MIT |
| `@manya/economy` | Budget tracking and enforcement with an audit ledger — composed from vault, ledger, memory | MIT |
| `@manya/guardian` | Standing-rules storage and enforcement with an audit trail — composed from vault, shield, ledger | MIT |
| `@manya/constitution` | Rules, policies, permissions, hierarchy, and emergency-protocol engine | Apache-2.0 |
| `@manya/council` | Multi-specialist analysis, conflict detection, and consensus synthesis | Apache-2.0 |
| `@manya/contracts` | Schema/manifest validation, API contract checking, compatibility diffing | Apache-2.0 |
| `@manya/customs-shield` | Sanctions screening, HS code validation, supply-chain risk scoring | Apache-2.0 |
| `@manya/nervous-system` | Cross-source event fabric (filesystem, network, OS, devices) with routing and filtering | Apache-2.0 |
| `@manya/weave` | Graph data structure, layout algorithms, search, and export (DOT/JSON) | Apache-2.0 |

The 6 Apache-2.0 packages were merged in from the [MANYA Intelligence OS](https://github.com/manya-hael/intelligence-os) project, a sibling platform under the same ecosystem. That project also ships its own standalone `keyring`/`attest`/`ledger`/`anonymize`/`memory`/`cortex` — intentionally not merged here, since this repo's versions above are the canonical ones for this workspace.

## CLI (manya)

```sh
# Mesh — tool registry and capability routing
manya mesh register-all                     # Register all 16 tools (including Lycon)
manya mesh list                             # List registered tools
manya mesh dispatch citationValidation validateDOI 10.1000/182
manya mesh channels                         # List declared sync channels

# Identity — cross-tool federation
manya identity create orcid 0000-0002-1825-0097 --metadata '{"name":"Josiah Carberry"}'
manya identity link <id> doi 10.1000/182 --source research-academic
manya identity resolve orcid 0000-0002-1825-0097
manya identity merge <idA> <idB>

# Event bus — pub/sub with sync-channel routing
manya bus publish citation-verified '{"type":"doi-verified"}' --source research-academic
manya bus route research-academic '{"type":"review-submitted"}'
manya bus stats

# Vocabularies — cross-domain translation
manya translate hs_code industry 300490
manya translate capability tool_id citationValidation

# Visualization — Manya Weave
manya weave --out ./manya-weave.html        # Generate interactive force-directed graph

# Server — HTTP REST API + SSE event stream
manya serve --port 3100                     # Boots server at http://localhost:3100

# Interactive shell
manya repl                                  # Tab-completion, history, persistent session

# Browser — launch Lycon
manya browse https://example.com            # Launch the privacy-first browser
manya browse --no-sandbox                   # For containerized environments

# Other
manya version
manya help
```

## Quick Start

```sh
npm install
npm run site:dev                           # Start the website at http://localhost:5173
manya serve                                # Start the HTTP API + SSE at http://localhost:3100
manya repl                                 # Interactive shell
manya browse                               # Launch the Lycon browser
```

Running tests:

```sh
npm run test:all              # Run everything
npm run tools:test            # All tool tests (including Lycon)
npm run packages:test         # Package tests
npm run test:7x7              # 27×7 = 190 cross-tool integration tests
```

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Craft Engine (Jest) | 35 | ✅ |
| Toolkit | 21 | ✅ |
| HelixFlow SDK | 3 | ✅ |
| Hawk | 18 | ✅ |
| Forge | 25 | ✅ |
| Stamp | 44 | ✅ |
| Vault | 32 | ✅ |
| Lens | 42 | ✅ |
| Shield | 55 | ✅ |
| Signal | 35 | ✅ |
| Pulse | 16 | ✅ |
| Primary Sector | 46 | ✅ |
| Cybersecurity | 61 | ✅ |
| Transport & Logistics | 66 | ✅ |
| Research & Academic | 73 | ✅ |
| Manya Unify | 75 | ✅ |
| Manya CLI (index + serve + repl) | 91 | ✅ |
| **Manya Lycon** | **59|Manya Lycon** | **59** | ✅ |
| **7×7 Performance v11** | **190** | ✅ |
| **Total** | **987** | ✅ |

## The "Unite or Connect" Layer

**Manya Unify** (`@manya/unify`) is the connective tissue that makes the ecosystem more than the sum of its parts. It provides four runtime services:

1. **Mesh** — A tool registry where each tool registers its manifest and API. The mesh routes capability-based calls to the owning tool.
2. **Federation** — Cross-tool identity linking. A single federated identity can tie together an ORCID iD, a DOI, a ROR ID, a vessel IMO number, a container number, an AWB, an HS code, an email, **and a browser profile** — pointing to the same real-world entity.
3. **Event Bus** — Pub/sub with sync-channel routing. When a tool emits an event, `routeEvent()` publishes to every sync channel declared in that tool's manifest.
4. **Vocabularies** — Cross-domain translation maps: HS code → Pulse industry, UN/LOCODE → country, industry → sector/research domain, capability → owning tool.

## Lycon Browser Integration

Lycon is a privacy-first web browser (inspired by Brave, with a wolf mascot "Claire") that runs on three platforms — Electron (desktop), WinUI 3 + WebView2 (Windows), and Kotlin + GeckoView (Android) — from a single shared UI bundle. The Manya integration adds:

1. **Event forwarding** — Browser events (navigation, shield-blocked, bookmark-added, download, tab-opened, tab-closed, identity-linked) flow into Manya's event bus on `lycon:*` sync channels.
2. **Identity federation** — Browser profiles can be linked to Manya federated identities, so your ORCID iD or DOI resolves to your browser profile.
3. **Warm theme** — Lycon adopts Manya's earthy gold/teal/sage palette on warm brown-black, matching the rest of the ecosystem.
4. **`manya browse` command** — Launch Lycon directly from the Manya CLI.

### Lycon Bridge Contract

Lycon's shared UI talks to a platform-agnostic bridge (`window.__lyconNative` → `window.lycon`). The Manya integration layer (`tools/lycon-browser/manya/index.js`) wraps this bridge to forward events to Manya's event bus without modifying Lycon's contract. See `BRIDGE_CONTRACT.md` for the full API reference.

### Lycon Deep Integration (v0.8.0)

Three features that wire Lycon deeper into the Manya ecosystem:

1. **Shield Intelligence** — When Lycon Shields blocks a URL, it's also checked against Manya's cybersecurity IOC database. Suspicious domains (free TLDs like `.tk`/`.ml`/`.ga`, phishing patterns) are auto-recorded as IOCs and classified as threats. The shield intelligence bridge (`createShieldIntelligence`) connects Lycon's ad blocker to the cybersecurity tool's `createIOC` and `classifyThreat` functions.

2. **Federated Identity Panel** — A toolbar panel controller (`createIdentityPanel`) that shows the current browser profile's linked Manya federated identity. Users can link/unlink profiles, switch between profiles, and see all linked profiles. Panel events (profile-switched, identity-linked, identity-unlinked) fire for UI updates.

3. **Private Mode with Temporary Identity** — `manya browse --private` auto-creates a temporary federated identity for the private session via `createPrivateSessionFactory`. The temporary profile is linked to a session-scoped identity, so even private browsing is identity-aware. When the session ends, the profile is automatically unlinked.

```sh
manya browse --private https://example.com  # Private session with temp identity
```

## Three Runtime Surfaces + Browser

The "unite/connect" theme is accessible from four surfaces:

1. **Shell** — `manya` CLI with subcommands for every Unify operation.
2. **HTTP** — `manya serve` boots an HTTP server exposing the full API via REST + SSE.
3. **Interactive** — `manya repl` provides a tab-completing, history-tracking shell.
4. **Browser** — `manya browse` launches Lycon with Manya integration enabled.

Everything Connected. Everyone Unified. Browse wild. Browse free.
