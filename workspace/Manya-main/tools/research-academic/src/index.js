/**
 * Manya Research & Academic — Citation parsing, reproducibility manifests,
 * peer-review provenance, and research-data management for the academic and
 * research domains.
 * Everything Connected. Everyone Unified.
 */

import { DOMAINS, DOMAIN_IDS } from './domains.js';
import {
  validateDOI,
  validateORCID,
  validateArxivID,
  validatePMID,
  validateNCT,
  validateROR,
  validateISBN13,
} from './citation.js';
import {
  createManifest,
  verifyManifest,
  assessFAIR,
} from './reproducibility.js';
import {
  createSubmission,
  assignReviewer,
  recordReview,
  recordDecision,
  recordRevision,
  verifyReviewIntegrity,
} from './peer-review.js';
import {
  getDomain,
  listDomains,
  createDMP,
  createDomainPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
} from './data-management.js';

export const researchAcademic = {
  getDomain,
  listDomains,
  validateDOI,
  validateORCID,
  validateArxivID,
  validatePMID,
  validateNCT,
  validateROR,
  validateISBN13,
  createManifest,
  verifyManifest,
  assessFAIR,
  createSubmission,
  assignReviewer,
  recordReview,
  recordDecision,
  recordRevision,
  verifyReviewIntegrity,
  createDMP,
  createDomainPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
  get DOMAINS() { return DOMAINS; },
  get DOMAIN_IDS() { return DOMAIN_IDS; },
};

export {
  DOMAINS,
  DOMAIN_IDS,
  getDomain,
  listDomains,
  validateDOI,
  validateORCID,
  validateArxivID,
  validatePMID,
  validateNCT,
  validateROR,
  validateISBN13,
  createManifest,
  verifyManifest,
  assessFAIR,
  createSubmission,
  assignReviewer,
  recordReview,
  recordDecision,
  recordRevision,
  verifyReviewIntegrity,
  createDMP,
  createDomainPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
};

export default researchAcademic;
