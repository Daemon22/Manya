# Manya Ecosystem — Comprehensive Reference

## What is Manya?

Manya means "unite or connect." It is a monorepo that serves as the public face and connective hub of the HAEL Foundation ecosystem — providing data encoding, encryption, compression, access control, secure messaging, compliance tooling, sector-specific validation, transport-logistics identifier validation, research-academic citation and reproducibility tooling, cybersecurity threat intelligence, and a privacy-first web browser (Lycon).

**Motto:** Everything Connected. Everyone Unified. Browse wild. Browse free.

## The HAEL Foundation Ecosystem

Manya is one branch of a larger ecosystem of segregated repositories that reference and reinforce each other:

| Repository | Role |
|---|---|
| **Manya** (this repo) | The public face and connective hub: tools, packages, and Lycon Browser |
| **MANYA Intelligence OS** | Sibling platform with standalone identity/memory/reasoning packages |
| **Gqobonco** | The Supreme Prince of Research, Intelligence & Information: Xhosa NLP Database, ancestral-knowledge preservation |
| **OMNIMIND** | The Supreme Intelligence Core |
| **Orren** | The Universal Mediator Language |

Each repo is independently buildable and testable; none depend on another at the code level.

## Repository Structure

```
Manya/
├── site/          # Website + live dashboards (manya-live.html, manya-weave-live.html)
├── tools/         # 16 deployable tools and product workspaces
├── packages/      # 20+ publishable shared libraries and SDKs
└── models/        # Reserved for model assets, adapters, and release notes
```

## The 16 Tools

| Tool | Description | Industries |
|---|---|---|
| **uSINGA** — API NEXUS | API provider wallet and smart routing | All |
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
| **Lycon Browser** | Privacy-first web browser with ad/tracker blocking (Lycon Shields), multi-tab browsing, bookmarks, history, downloads, and private mode. Integrated with Manya's event bus and federated identities. | All |

## The 20+ Packages

### Core Packages (MIT)

| Package | Description |
|---|---|
| `@manya/toolkit` | Shared manifests, capability boundaries, and synchronization contracts for all 16 tools |
| `@manya/helixflow-sdk` | HelixFlow client and workflow helpers |
| `@manya/craft-engine` | 7-fold compression, encryption, archiving, and CLI |
| `@manya/unify` | Connective tissue: mesh, federation, event bus, vocabularies |
| `@manya/cli` | Command-line interface, HTTP server, and interactive REPL |
| `@manya/lycon` | Lycon browser Manya integration layer (adapter, event factories, manifest) |

### Composite Packages (MIT) — Built from core tools

| Package | Composed From |
|---|---|
| `@manya/keyring` | vault, forge, signal, shield — sovereign identity wallet |
| `@manya/attest` | hawk, signal, shield — device/session attestation |
| `@manya/ledger` | stamp, unify — tamper-evident audit ledger |
| `@manya/anonymize` | lens, research-academic — redaction + reproducibility pipeline |
| `@manya/memory` | vault, stamp, unify — working/episodic/semantic/procedural/archival memory engine |
| `@manya/cortex` | memory, unify, shield, stamp — capability-based task routing and decision auditing |
| `@manya/perception` | memory, lens, hawk — redacted ingestion of text/structured/environment signals into working memory |
| `@manya/telepathy` | keyring, memory, unify — signed inter-agent messaging |
| `@manya/reflection` | memory, cortex — plan critique and failure-driven replanning |
| `@manya/economy` | vault, ledger, memory — budget tracking and enforcement with an audit ledger |
| `@manya/guardian` | vault, shield, ledger — standing-rules storage and enforcement with an audit trail |

### Intelligence OS Packages (Apache-2.0) — Merged from MANYA Intelligence OS

| Package | Description |
|---|---|
| `@manya/constitution` | Rules, policies, permissions, hierarchy, and emergency-protocol engine |
| `@manya/council` | Multi-specialist analysis, conflict detection, and consensus synthesis |
| `@manya/contracts` | Schema/manifest validation, API contract checking, compatibility diffing |
| `@manya/customs-shield` | Sanctions screening, HS code validation, supply-chain risk scoring |
| `@manya/nervous-system` | Cross-source event fabric (filesystem, network, OS, devices) with routing and filtering |
| `@manya/weave` | Graph data structure, layout algorithms, search, and export (DOT/JSON) |

## The CLI (`manya`)

The Manya CLI provides shell access to the entire ecosystem through these subcommands:

- **mesh** — Tool registry and capability routing (register-all, list, dispatch, channels)
- **identity** — Cross-tool identity federation (create, link, resolve, merge)
- **bus** — Event bus pub/sub with sync-channel routing (publish, route, stats)
- **translate** — Cross-domain vocabulary translation (hs_code, industry, capability)
- **weave** — Generate interactive force-directed graph visualization
- **serve** — HTTP REST API + SSE event stream server (default port 3100)
- **repl** — Interactive shell with tab-completion and persistent history
- **browse** — Launch the Lycon privacy-first browser (supports --private, --no-sandbox)

## Four Runtime Surfaces

1. **Shell** — `manya` CLI with subcommands for every Unify operation
2. **HTTP** — `manya serve` boots an HTTP server exposing the full API via REST + SSE
3. **Interactive** — `manya repl` provides a tab-completing, history-tracking shell
4. **Browser** — `manya browse` launches Lycon with Manya integration enabled

## Manya Unify — The Connective Tissue

Manya Unify (`@manya/unify`) provides four runtime services:

1. **Mesh** — A tool registry where each tool registers its manifest and API. Routes capability-based calls to the owning tool.
2. **Federation** — Cross-tool identity linking. A single federated identity can tie together an ORCID iD, a DOI, a ROR ID, a vessel IMO number, a container number, an AWB, an HS code, an email, and a browser profile — all pointing to the same real-world entity.
3. **Event Bus** — Pub/sub with sync-channel routing. When a tool emits an event, `routeEvent()` publishes to every sync channel declared in that tool's manifest.
4. **Vocabularies** — Cross-domain translation maps: HS code → Pulse industry, UN/LOCODE → country, industry → sector/research domain, capability → owning tool.

## Lycon Browser Integration

Lycon is a privacy-first web browser (inspired by Brave, wolf mascot "Claire") running on three platforms from a single shared UI bundle:
- **Electron** (desktop)
- **WinUI 3 + WebView2** (Windows)
- **Kotlin + GeckoView** (Android)

### Manya Integration Features
1. **Event forwarding** — Browser events (navigation, shield-blocked, bookmark-added, download, tab-opened/closed, identity-linked) flow into Manya's event bus on `lycon:*` sync channels.
2. **Identity federation** — Browser profiles linked to Manya federated identities.
3. **Warm theme** — Earthy gold/teal/sage palette on warm brown-black.
4. **`manya browse` command** — Launch Lycon directly from CLI.

### Deep Integration (v0.8.0)
1. **Shield Intelligence** — Blocked URLs checked against Cybersecurity IOC database; suspicious domains auto-recorded as IOCs.
2. **Federated Identity Panel** — Toolbar panel showing linked Manya identity; link/unlink/switch profiles.
3. **Private Mode with Temporary Identity** — `manya browse --private` auto-creates session-scoped federated identity, auto-unlinked when session ends.

### Bridge Contract
Lycon's UI talks to a platform-agnostic bridge (`window.__lyconNative → window.lycon`). The Manya integration wraps this bridge to forward events to the event bus without modifying Lycon's contract.

## Test Suite — 987 Tests

| Suite | Tests |
|---|---|
| Craft Engine | 35 |
| Toolkit | 21 |
| HelixFlow SDK | 3 |
| Hawk | 18 |
| Forge | 25 |
| Stamp | 44 |
| Vault | 32 |
| Lens | 42 |
| Shield | 55 |
| Signal | 35 |
| Pulse | 16 |
| Primary Sector | 46 |
| Cybersecurity | 61 |
| Transport & Logistics | 66 |
| Research & Academic | 73 |
| Manya Unify | 75 |
| Manya CLI | 91 |
| Manya Lycon | 59 |
| 7×7 Performance | 190 |
| **Total** | **987** |