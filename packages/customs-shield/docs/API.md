# @manya/customs-shield — API Reference

> Complete TypeScript API reference for `@manya/customs-shield` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [CustomsShield](#customsshield)
- [HS Codes](#hs-codes)
- [Sanctions](#sanctions)
- [Compliance](#compliance)
- [Restrictions](#restrictions)
- [Risk](#risk)
- [Reporting](#reporting)

---

## Types

### `HSCode`
```ts
interface HSCode {
  issuingCountry: string;
  international: string;        // 6 digits
  nationalSuffix?: string;      // 7-10 digits
  description: string;
  unit?: string;
  generalDutyRate?: number;
  preferentialRate?: number;
  exportControlled?: boolean;
  importLicenseRequired?: boolean;
}
```

### `TradeParty`
```ts
interface TradeParty {
  name: string;
  country: string;       // ISO 3166-1 alpha-2
  address?: string;
  taxId?: string;
  aliases?: string[];
}
```

### `CargoItem`
```ts
interface CargoItem {
  description: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitValue: number;
  weightKg?: number;
  countryOfOrigin: string;
}
```

### `Shipment`
```ts
interface Shipment {
  id: string;
  shipper: TradeParty;
  consignee: TradeParty;
  originCountry: string;
  destinationCountry: string;
  transshipmentCountries?: string[];
  items: CargoItem[];
  declaredValue: number;
  currency: string;
  createdAt: string;
  incoterm?: string;
  mode?: 'air' | 'sea' | 'road' | 'rail' | 'mail' | 'multimodal';
  declaredDuty?: number;        // optional; if absent, duty delta is computed against 0
}
```

### `ShieldFinding`
```ts
interface ShieldFinding {
  category:
    | 'hs_code_invalid' | 'hs_code_mismatch' | 'hs_code_suggestion'
    | 'sanctions_hit' | 'sanctions_country_hit'
    | 'restriction_violation'
    | 'license_required'
    | 'duty_miscalculation'
    | 'documentation_gap'
    | 'vulnerability'
    | 'risk_indicator';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ref?: string;
  remediation?: string;
  confidence: number;  // [0,1]
}
```

### `ShieldReport`
```ts
interface ShieldReport {
  shipmentId: string;
  riskScore: number;          // 0-100
  riskBand: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  holdForReview: boolean;
  findings: ShieldFinding[];
  counts: Record<string, number>;
  duty?: { declared: number; expected: number; delta: number };
  generatedAt: string;
  elapsedMs: number;
}
```

### `RegulatoryReport`
```ts
interface RegulatoryReport {
  regulator: string;
  shipmentId: string;
  type: string;
  fields: Record<string, string | number | boolean | string[] | unknown[] | Record<string, unknown>>;
  generatedAt: string;
}
```

---

## Errors

All errors extend `CustomsShieldError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `CustomsShieldError` | `CUSTOMS_SHIELD_ERROR` | Base class |
| `HSCodeError` | `HS_CODE_ERROR` | Invalid HS code format |
| `SanctionsError` | `SANCTIONS_ERROR` | Sanctions list or screening failure |
| `ComplianceError` | `COMPLIANCE_ERROR` | Invalid rule set |
| `RestrictionError` | `RESTRICTION_ERROR` | Invalid restriction list |
| `RiskError` | `RISK_ERROR` | Risk scoring failure |
| `ReportingError` | `REPORTING_ERROR` | Report generation failure |

---

## CustomsShield

### `class CustomsShield`
```ts
new CustomsShield(config?: ShieldConfig)
```
- `.screen(shipment: Shipment): ShieldReport`

### `screen(shipment, config?)`
Convenience: `new CustomsShield(config).screen(shipment)`.

### `ShieldConfig`
```ts
interface ShieldConfig {
  sanctionsThreshold?: number;  // default 0.75
  holdThreshold?: number;       // default 50
  computeDuty?: boolean;        // default true
  logLevel?: LogLevel;
  logger?: Logger;
}
```

---

## HS Codes

### Catalog management
- `buildDefaultCatalog(): HSCatalog`
- `setCatalog(cat: HSCatalog): void`
- `getCatalog(): HSCatalog`
- `lookup(code: string): HSCode | undefined`

### Validation
- `isValidFormat(code: string): boolean`
- `normalize(code: string): string` — throws `HSCodeError` on invalid
- `chapter(code: string): string` — returns '' on invalid
- `heading(code: string): string`
- `international(code: string): string`
- `validate(code: string): { valid: boolean; partial?: boolean; reason?: string; entry?: HSCode }`

### Suggestion
- `suggest(description: string, limit?: number): Array<{ code; description; score }>`
- `verifyMatch(code, description): { match; confidence; reason }`

---

## Sanctions

### List management
- `DEFAULT_COUNTRY_SANCTIONS: SanctionsEntry[]`
- `setSanctionsList(list: SanctionsEntry[]): void`
- `getSanctionsList(): SanctionsEntry[]`

### Matching primitives
- `normalizeName(name: string): string`
- `levenshtein(a: string, b: string): number`
- `similarity(a: string, b: string): number` — in [0,1]

### Screening
- `screenParty(party: TradeParty, threshold?: number): ScreeningResult`
- `screenParties(parties: TradeParty[], threshold?: number): ShieldFinding[]`

### `ScreeningResult`
```ts
interface ScreeningResult {
  party: TradeParty;
  hits: Array<{
    entry: SanctionsEntry;
    confidence: number;
    matchType: 'exact' | 'partial' | 'fuzzy';
    matchBasis: 'country' | 'name';
  }>;
}
```

---

## Compliance

### Rule set management
- `DEFAULT_RULE_SET: ComplianceRuleSet`
- `setRuleSet(rules: ComplianceRuleSet): void`
- `getRuleSet(): ComplianceRuleSet`

### Checks
- `checkEmbargoes(shipment): ShieldFinding[]`
- `checkLicenses(shipment): ShieldFinding[]`
- `checkRestrictedOrigins(shipment): ShieldFinding[]`
- `calculateDuty(shipment): { declared; expected; delta; perItem }`

### Rule interfaces
- `EmbargoRule` — `{ fromCountry; toCountry; reason }`
- `LicenseRule` — `{ destinationCountry; hsChapter; licenseType; reason }`
- `RestrictedOriginRule` — `{ destinationCountry; originCountry; reason }`
- `DutyRule` — `{ destinationCountry; hsChapter; rate }`

---

## Restrictions

- `DEFAULT_PRODUCT_RESTRICTIONS: ProductRestriction[]`
- `setRestrictions(list): void`
- `getRestrictions(): ProductRestriction[]`

### `ProductRestriction`
```ts
interface ProductRestriction {
  destinationCountry: string;  // '*' for all
  hsChapters: string[];
  type: 'prohibited' | 'license_required' | 'quota' | 'documentation_required';
  reason: string;
  quotaAmount?: number;
}
```

---

## Risk

### Constants
- `HIGH_RISK_TRANSSHIPMENT: string[]` — ['AE', 'PA', 'HK', 'SG', 'MT', 'CY', 'BS', 'KY']
- `INDICATOR_WEIGHTS` — per-category weights

### Functions
- `detectIndicators(shipment): ShieldFinding[]`
- `analyzeVulnerabilities(shipment): ShieldFinding[]`
- `scoreFrom(findings): { score; band; holdForReview }`
- `bandFor(score): 'low' | 'moderate' | 'elevated' | 'high' | 'critical'`

---

## Reporting

- `buildImportDeclaration(shipment, regulator): RegulatoryReport`
- `buildSanctionsRecord(shipment, regulator, report): RegulatoryReport`
- `serialize(report): string`
- `validateReport(report): { valid; missing }`
