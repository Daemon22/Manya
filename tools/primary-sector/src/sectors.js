/**
 * Primary sector definitions for the Manya Primary Sector tool.
 * Covers Agriculture, Mining, Forestry, and Fishing — the extractive industries
 * that produce raw materials from natural resources.
 */

export const SECTORS = {
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Crop production, livestock farming, aquaculture, and agri-processing with GPS traceability, commodity validation, and environmental compliance.',
    frameworks: ['GLOBALG.A.P', 'HACCP-Agri', 'EU-CAP', 'USDA-Organic', 'POPIA-Agri'],
    dataClassifications: ['crop-yield', 'livestock-health', 'pesticide-record', 'soil-data', 'weather-data', 'farm-pii'],
    redactionPreset: 'agriculture',
    accessTemplate: 'agriculture-rbac',
    stampTemplate: 'agriculture-audit',
    signalTypes: ['crop-report', 'livestock-alert', 'weather-warning', 'pesticide-application', 'harvest-record'],
    vaultNamespace: 'agriculture',
    commodities: ['wheat', 'corn', 'rice', 'soybeans', 'coffee', 'cotton', 'sugar', 'cocoa'],
    units: ['hectare', 'acre', 'tonne', 'bushel', 'kilogram', 'liter'],
    complianceNotes: [
      'Pesticide application records must include date, product, dosage, and applicator identity',
      'GPS coordinates of treated fields must be logged for traceability',
      'Livestock health records require tamper-proof audit trails',
      'Organic certification requires documented chain of custody for inputs',
      'Farm operator PII must be protected under applicable privacy regulations',
    ],
  },
  mining: {
    id: 'mining',
    name: 'Mining & Extraction',
    description: 'Mineral extraction, ore processing, mine safety compliance, environmental monitoring, and resource provenance tracking.',
    frameworks: ['ISO-14001-Mining', 'ICMM-Principles', 'SAMREC', 'JORC-Code', 'OSHA-Mining', 'DMR-Compliance'],
    dataClassifications: ['ore-grade', 'blast-plan', 'environmental-monitor', 'safety-incident', 'geological-survey', 'mine-pii'],
    redactionPreset: 'mining',
    accessTemplate: 'mining-rbac',
    stampTemplate: 'mining-audit',
    signalTypes: ['blast-notification', 'ore-grade-report', 'safety-incident', 'environmental-reading', 'resource-declaration'],
    vaultNamespace: 'mining',
    commodities: ['gold', 'copper', 'iron-ore', 'platinum', 'coal', 'diamonds', 'chromium', 'manganese'],
    units: ['tonne', 'carat', 'ounce-troy', 'kilogram', 'cubic-meter'],
    complianceNotes: [
      'Ore grade declarations must be independently verified with timestamp proof',
      'Blast plans require cryptographic sign-off before execution',
      'Environmental monitoring data must be tamper-evident and continuously logged',
      'Safety incidents must be reported within regulated timeframes with immutable records',
      'Resource declarations must comply with SAMREC/JORC reporting standards',
    ],
  },
  forestry: {
    id: 'forestry',
    name: 'Forestry & Timber',
    description: 'Sustainable forestry management, timber tracking, deforestation monitoring, carbon credit verification, and supply chain provenance.',
    frameworks: ['FSC', 'PEFC', 'EU-Timber-Regulation', 'CITES-Timber', 'ISO-14001-Forestry'],
    dataClassifications: ['timber-yield', 'felling-permit', 'reforestation-record', 'carbon-credit', 'biodiversity-survey', 'forest-pii'],
    redactionPreset: 'forestry',
    accessTemplate: 'forestry-rbac',
    stampTemplate: 'forestry-audit',
    signalTypes: ['felling-permit', 'timber-shipment', 'reforestation-certificate', 'carbon-credit-issue', 'deforestation-alert'],
    vaultNamespace: 'forestry',
    commodities: ['pine', 'oak', 'eucalyptus', 'teak', 'mahogany', 'spruce', 'cedar', 'bamboo'],
    units: ['cubic-meter', 'board-foot', 'hectare', 'tonne', 'linear-meter'],
    complianceNotes: [
      'Felling permits must be timestamped and verified before any harvest activity',
      'Timber shipments require chain of custody from forest to mill to market',
      'Carbon credit calculations must be auditable with verifiable data provenance',
      'Reforestation commitments must be tracked with geospatial proof',
      'Protected species surveys must be completed before logging permits are issued',
    ],
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing & Aquaculture',
    description: 'Commercial fishing, aquaculture operations, catch documentation, vessel tracking, marine compliance, and sustainable harvest verification.',
    frameworks: ['MSC', 'EU-CFP', 'RFMO-Compliance', 'HACCP-Seafood', 'ILO-Fishing', 'POPIA-Fishing'],
    dataClassifications: ['catch-record', 'vessel-track', 'species-data', 'quota-usage', 'marine-monitor', 'fisher-pii'],
    redactionPreset: 'fishing',
    accessTemplate: 'fishing-rbac',
    stampTemplate: 'fishing-audit',
    signalTypes: ['catch-declaration', 'vessel-position', 'quota-alert', 'species-identification', 'landing-certificate'],
    vaultNamespace: 'fishing',
    commodities: ['tuna', 'salmon', 'shrimp', 'cod', 'hake', 'sardine', 'lobster', 'seaweed'],
    units: ['tonne', 'kilogram', 'metric-ton', 'piece', 'dozen', 'liter'],
    complianceNotes: [
      'Catch declarations must include species, weight, location (GPS), and timestamp',
      'Vessel tracking data must be integrity-protected to prevent tampering',
      'Quota usage must be real-time verified against RFMO limits',
      'Landing certificates require cryptographic proof of catch origin',
      'Protected species bycatch must be reported with tamper-proof records',
    ],
  },
};

export const SECTOR_IDS = Object.keys(SECTORS);
