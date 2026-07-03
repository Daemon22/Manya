import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDistinctCapabilities,
  helixFlowManifest,
  usingaManifest,
  forgeManifest,
  craftEngineManifest,
  stampManifest,
  vaultManifest,
  lensManifest,
  shieldManifest,
  signalManifest,
  pulseManifest,
  primarySectorManifest,
  cybersecurityManifest,
  transportLogisticsManifest,
  researchAcademicManifest,
  unifyManifest,
  lyconManifest,
  upmpManifest,
  capabilityOwners,
  createToolManifest,
} from "../src/index.js";

// Verify the built-in manifests have no overlapping capabilities
test("uSINGA and HelixFlow own distinct capabilities", () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest]);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

// Verify that claiming another tool's capability is detected
test("detects accidental capability overlap", () => {
  const result = assertDistinctCapabilities([
    usingaManifest,
    { ...helixFlowManifest, owns: [...helixFlowManifest.owns, "apiKeyVault"] }
  ]);
  assert.equal(result.distinct, false);
  assert.equal(result.overlaps[0].capability, "apiKeyVault");
});

// New: All four manifests are distinct
test("all four tool manifests have distinct capabilities", () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest]);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

// New: Forge manifest has correct structure
test("Forge manifest has correct identity and capabilities", () => {
  assert.equal(forgeManifest.id, "forge");
  assert.equal(forgeManifest.name, "Forge");
  assert.equal(forgeManifest.foundation, "Manya");
  assert.ok(forgeManifest.owns.includes("keyDerivation"));
  assert.ok(forgeManifest.owns.includes("passphraseStrength"));
  assert.ok(forgeManifest.owns.includes("keyRotation"));
  assert.ok(forgeManifest.owns.includes("multiAlgorithmHash"));
});

// New: Craft Engine manifest has correct structure
test("Craft Engine manifest has correct identity and capabilities", () => {
  assert.equal(craftEngineManifest.id, "craft-engine");
  assert.equal(craftEngineManifest.name, "Craft Engine");
  assert.equal(craftEngineManifest.foundation, "Manya");
  assert.ok(craftEngineManifest.owns.includes("compressionAnalytics"));
});

// New: capabilityOwners includes Forge and Craft Engine
test("capabilityOwners includes Forge and Craft Engine entries", () => {
  assert.equal(capabilityOwners.keyDerivation, "forge");
  assert.equal(capabilityOwners.passphraseStrength, "forge");
  assert.equal(capabilityOwners.compressionAnalytics, "craft-engine");
});

// Primary Sector manifest
test("Primary Sector manifest has correct identity and capabilities", () => {
  assert.equal(primarySectorManifest.id, "primary-sector");
  assert.equal(primarySectorManifest.name, "Primary Sector");
  assert.equal(primarySectorManifest.foundation, "Manya");
  assert.ok(primarySectorManifest.owns.includes("sectorValidation"));
  assert.ok(primarySectorManifest.owns.includes("sectorCompliance"));
  assert.ok(primarySectorManifest.owns.includes("sectorPresets"));
  assert.ok(primarySectorManifest.owns.includes("coordinateValidation"));
  assert.ok(primarySectorManifest.owns.includes("productionReporting"));
});

// Cybersecurity manifest
test("Cybersecurity manifest has correct identity and capabilities", () => {
  assert.equal(cybersecurityManifest.id, "cybersecurity");
  assert.equal(cybersecurityManifest.name, "Cybersecurity");
  assert.equal(cybersecurityManifest.foundation, "Manya");
  assert.ok(cybersecurityManifest.owns.includes("threatIntelligence"));
  assert.ok(cybersecurityManifest.owns.includes("vulnerabilityAssessment"));
  assert.ok(cybersecurityManifest.owns.includes("securityCompliance"));
  assert.ok(cybersecurityManifest.owns.includes("digitalForensics"));
  assert.ok(cybersecurityManifest.owns.includes("incidentResponse"));
});

// All 12 manifests are distinct
test("all 12 tool manifests have distinct capabilities", () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest,
    signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest,
  ];
  const result = assertDistinctCapabilities(allManifests);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

// Transport & Logistics manifest
test("Transport & Logistics manifest has correct identity and capabilities", () => {
  assert.equal(transportLogisticsManifest.id, "transport-logistics");
  assert.equal(transportLogisticsManifest.name, "Transport & Logistics");
  assert.equal(transportLogisticsManifest.foundation, "Manya");
  assert.ok(transportLogisticsManifest.owns.includes("transportModePresets"));
  assert.ok(transportLogisticsManifest.owns.includes("transportIdentifierValidation"));
  assert.ok(transportLogisticsManifest.owns.includes("shipmentTracking"));
  assert.ok(transportLogisticsManifest.owns.includes("customsCompliance"));
  assert.ok(transportLogisticsManifest.owns.includes("dangerousGoodsClassification"));
  assert.ok(transportLogisticsManifest.owns.includes("sanctionsScreening"));
});

// Research & Academic manifest
test("Research & Academic manifest has correct identity and capabilities", () => {
  assert.equal(researchAcademicManifest.id, "research-academic");
  assert.equal(researchAcademicManifest.name, "Research & Academic");
  assert.equal(researchAcademicManifest.foundation, "Manya");
  assert.ok(researchAcademicManifest.owns.includes("researchDomainPresets"));
  assert.ok(researchAcademicManifest.owns.includes("citationValidation"));
  assert.ok(researchAcademicManifest.owns.includes("reproducibilityManifests"));
  assert.ok(researchAcademicManifest.owns.includes("peerReviewProvenance"));
  assert.ok(researchAcademicManifest.owns.includes("researchDataManagement"));
});

// Unify manifest
test("Unify manifest has correct identity and capabilities", () => {
  assert.equal(unifyManifest.id, "unify");
  assert.equal(unifyManifest.name, "Manya Unify");
  assert.equal(unifyManifest.foundation, "Manya");
  assert.ok(unifyManifest.owns.includes("toolFederation"));
  assert.ok(unifyManifest.owns.includes("identityLinking"));
  assert.ok(unifyManifest.owns.includes("syncChannelRouting"));
  assert.ok(unifyManifest.owns.includes("vocabularyBridging"));
  assert.ok(unifyManifest.owns.includes("capabilityDispatch"));
});

// Lycon manifest
test("Lycon manifest has correct identity and capabilities", () => {
  assert.equal(lyconManifest.id, "lycon-browser");
  assert.equal(lyconManifest.name, "Lycon Browser");
  assert.equal(lyconManifest.foundation, "Manya");
  assert.ok(lyconManifest.owns.includes("webBrowsing"));
  assert.ok(lyconManifest.owns.includes("adBlocking"));
  assert.ok(lyconManifest.owns.includes("bookmarkManagement"));
  assert.ok(lyconManifest.owns.includes("downloadManagement"));
  assert.ok(lyconManifest.owns.includes("privateBrowsing"));
  assert.ok(lyconManifest.owns.includes("browserHistoryManagement"));
});

// UPMP manifest
test("UPMP manifest has correct identity and capabilities", () => {
  assert.equal(upmpManifest.id, "upmp");
  assert.equal(upmpManifest.name, "UPMP");
  assert.equal(upmpManifest.foundation, "Manya");
  assert.ok(upmpManifest.owns.includes("activityTracking"));
  assert.ok(upmpManifest.owns.includes("stuckPointDetection"));
  assert.ok(upmpManifest.owns.includes("discoveryLogging"));
  assert.ok(upmpManifest.owns.includes("intelligenceEngagement"));
  assert.ok(upmpManifest.owns.includes("progressMonitoring"));
  assert.ok(upmpManifest.owns.includes("discussionExport"));
});

// All 17 manifests are distinct
test("all 17 tool manifests have distinct capabilities", () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest,
    signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  const result = assertDistinctCapabilities(allManifests);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

// capabilityOwners includes Primary Sector and Cybersecurity entries
test("capabilityOwners includes Primary Sector and Cybersecurity entries", () => {
  assert.equal(capabilityOwners.sectorValidation, "primary-sector");
  assert.equal(capabilityOwners.sectorCompliance, "primary-sector");
  assert.equal(capabilityOwners.coordinateValidation, "primary-sector");
  assert.equal(capabilityOwners.threatIntelligence, "cybersecurity");
  assert.equal(capabilityOwners.vulnerabilityAssessment, "cybersecurity");
  assert.equal(capabilityOwners.digitalForensics, "cybersecurity");
  assert.equal(capabilityOwners.incidentResponse, "cybersecurity");
});

// capabilityOwners includes Transport & Logistics entries
test("capabilityOwners includes Transport & Logistics entries", () => {
  assert.equal(capabilityOwners.transportModePresets, "transport-logistics");
  assert.equal(capabilityOwners.transportIdentifierValidation, "transport-logistics");
  assert.equal(capabilityOwners.shipmentTracking, "transport-logistics");
  assert.equal(capabilityOwners.customsCompliance, "transport-logistics");
  assert.equal(capabilityOwners.dangerousGoodsClassification, "transport-logistics");
  assert.equal(capabilityOwners.sanctionsScreening, "transport-logistics");
});

// capabilityOwners includes Research & Academic entries
test("capabilityOwners includes Research & Academic entries", () => {
  assert.equal(capabilityOwners.researchDomainPresets, "research-academic");
  assert.equal(capabilityOwners.citationValidation, "research-academic");
  assert.equal(capabilityOwners.reproducibilityManifests, "research-academic");
  assert.equal(capabilityOwners.peerReviewProvenance, "research-academic");
  assert.equal(capabilityOwners.researchDataManagement, "research-academic");
});

// capabilityOwners includes Unify entries
test("capabilityOwners includes Unify entries", () => {
  assert.equal(capabilityOwners.toolFederation, "unify");
  assert.equal(capabilityOwners.identityLinking, "unify");
  assert.equal(capabilityOwners.syncChannelRouting, "unify");
  assert.equal(capabilityOwners.vocabularyBridging, "unify");
  assert.equal(capabilityOwners.capabilityDispatch, "unify");
});

// capabilityOwners includes Lycon entries
test("capabilityOwners includes Lycon entries", () => {
  assert.equal(capabilityOwners.webBrowsing, "lycon-browser");
  assert.equal(capabilityOwners.adBlocking, "lycon-browser");
  assert.equal(capabilityOwners.bookmarkManagement, "lycon-browser");
  assert.equal(capabilityOwners.downloadManagement, "lycon-browser");
  assert.equal(capabilityOwners.privateBrowsing, "lycon-browser");
  assert.equal(capabilityOwners.browserHistoryManagement, "lycon-browser");
});

// capabilityOwners includes UPMP entries
test("capabilityOwners includes UPMP entries", () => {
  assert.equal(capabilityOwners.activityTracking, "upmp");
  assert.equal(capabilityOwners.stuckPointDetection, "upmp");
  assert.equal(capabilityOwners.discoveryLogging, "upmp");
  assert.equal(capabilityOwners.intelligenceEngagement, "upmp");
  assert.equal(capabilityOwners.progressMonitoring, "upmp");
  assert.equal(capabilityOwners.discussionExport, "upmp");
});

// Total capability count check (64+ capabilities across 17 tools)
test("capabilityOwners has at least 64 capabilities", () => {
  assert.ok(Object.keys(capabilityOwners).length >= 64, `Expected at least 64 capabilities, got ${Object.keys(capabilityOwners).length}`);
});

// Hands-off consistency across all manifests
test("all manifests hands-off are owned by some other manifest", () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest,
    signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  const allOwns = new Set();
  for (const m of allManifests) {
    for (const cap of m.owns) allOwns.add(cap);
  }
  for (const m of allManifests) {
    for (const cap of m.handsOff) {
      assert.ok(allOwns.has(cap), `${m.name} hands off ${cap} but nobody owns it`);
    }
  }
});
