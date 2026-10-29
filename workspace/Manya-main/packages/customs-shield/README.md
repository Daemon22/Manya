# @manya/customs-shield

> Compliance and supply-chain intelligence — customs validation, HS code verification, sanctions screening, import/export compliance, cargo risk assessment, and shipment risk scoring for the MANYA Intelligence OS.

`@manya/customs-shield` is the trade-compliance substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides HS code validation against a built-in WCO chapter catalog, sanctions screening with fuzzy name matching against OFAC/EU/UN/UK lists, embargo detection, license-required checks, restricted-origin rules, product restriction rules (Wassenaar, CITES, Montreal Protocol, UNESCO 1970), cargo risk scoring on a 0-100 scale with severity-weighted findings, and regulatory report generation.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/customs-shield` extends that sovereignty into the supply-chain domain: **your compliance posture, your risk threshold, your screening rules — yours alone.**

- **Sovereign.** No network calls. Sanctions lists and rule sets are local and configurable.
- **Auditable.** Every screening produces a structured `ShieldReport` with per-finding provenance.
- **Extensible.** Replace the sanctions list, rule set, or product restrictions via single-function APIs.
- **Reproducible.** Identical shipments + identical configs produce identical reports.
- **Honest.** Confidence scores and severity bands are explicit; no opaque "risk oracles".

---

## Features

| Area | What you get |
| --- | --- |
| **HS codes** | Built-in WCO chapter catalog (all 99 chapters). Format validation, normalization, lookup, suggestion by keyword, description/code match verification. |
| **Sanctions** | Built-in country-level sanctions list (OFAC, EU, UN, UK). Name normalization, Levenshtein-based fuzzy matching, per-party screening, party-batch screening. |
| **Compliance rules** | Embargo rules, license-required rules, restricted-origin rules, duty rules. All data-driven and overridable via `setRuleSet`. |
| **Restrictions** | Wassenaar dual-use, UN drug precursors, UNESCO cultural property, Montreal Protocol ozone-depleters, CITES endangered species. |
| **Risk scoring** | 11-category weighted findings, severity-scaled per-finding caps, 0-100 score with 5 bands (low/moderate/elevated/high/critical), automatic hold-for-review on critical findings. |
| **Vulnerability analysis** | Single-item value concentration, circular trade (shipper==consignee), high-risk transshipment detection. |
| **Reporting** | `buildImportDeclaration`, `buildSanctionsRecord`, `serialize`, `validateReport`. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/customs-shield
```

Requires Node.js 18+.

---

## Quick start

### 1. Screen a shipment

```ts
import { screen } from '@manya/customs-shield';

const report = screen({
  id: 'shp-001',
  shipper: { name: 'Acme Corp', country: 'US' },
  consignee: { name: 'Beta LLC', country: 'DE' },
  originCountry: 'US',
  destinationCountry: 'DE',
  mode: 'air',
  incoterm: 'FCA',
  items: [
    { description: 'T-shirts', hsCode: '610910', quantity: 1000, unit: 'pcs', unitValue: 5, countryOfOrigin: 'US', weightKg: 200 },
  ],
  declaredValue: 5000,
  currency: 'USD',
  createdAt: '2024-06-01',
});
console.log(report.riskScore); // 0-100
console.log(report.riskBand);  // 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
console.log(report.holdForReview);
console.log(report.findings);
```

### 2. Use a configured CustomsShield instance

```ts
import { CustomsShield } from '@manya/customs-shield';

const shield = new CustomsShield({
  sanctionsThreshold: 0.85,  // stricter matching
  holdThreshold: 60,         // higher tolerance before hold
  logLevel: 'info',
});

const report = shield.screen(shipment);
```

### 3. Replace the sanctions list with your own

```ts
import { setSanctionsList } from '@manya/customs-shield';

setSanctionsList([
  { list: 'OFAC', name: 'Entity X', country: 'RU', program: 'EO 14024', aliases: ['X Holdings'] },
  // ... load full OFAC SDN list here
]);
```

### 4. Generate a regulatory report

```ts
import { buildImportDeclaration, serialize } from '@manya/customs-shield';

const decl = buildImportDeclaration(shipment, 'CBP');
console.log(serialize(decl));
```

---

## Configuration

```ts
export interface ShieldConfig {
  sanctionsThreshold?: number;  // default 0.75
  holdThreshold?: number;       // default 50
  computeDuty?: boolean;        // default true
  logLevel?: LogLevel;          // default 'info'
  logger?: Logger;
}
```

### Risk bands

| Score range | Band | Behavior |
| --- | --- | --- |
| 0-9 | low | No hold. |
| 10-24 | moderate | No hold. |
| 25-49 | elevated | No hold. |
| 50-74 | high | Hold for review. |
| 75-100 | critical | Hold for review. |

Any `critical` severity finding also triggers `holdForReview: true` regardless of score.

---

## Extending

### Add a custom compliance rule

```ts
import { setRuleSet, getRuleSet } from '@manya/customs-shield';

const current = getRuleSet();
setRuleSet({
  ...current,
  licenses: [
    ...current.licenses,
    { destinationCountry: 'BR', hsChapter: '27', licenseType: 'import', reason: 'ANP license required for fuel imports' },
  ],
});
```

### Add a custom product restriction

```ts
import { setRestrictions, getRestrictions } from '@manya/customs-shield';

const current = getRestrictions();
setRestrictions([
  ...current,
  { destinationCountry: 'US', hsChapters: ['95'], type: 'documentation_required', reason: 'Toy safety certification (CPSC)' },
]);
```

---

## Security notes

- **Local-only.** No data leaves the host process.
- **No PII in logs.** `taxId`, `secret`, `token`, `apiKey`, `password` are scrubbed.
- **Defense in depth.** Sanctions matching uses both exact and fuzzy matching; findings carry confidence scores.
- **Reproducibility.** Identical inputs + configs → identical reports.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
