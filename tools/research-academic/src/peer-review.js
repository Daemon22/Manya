/**
 * Peer-review provenance and integrity tracking for the
 * Manya Research & Academic tool.
 *
 * Models the peer-review lifecycle: submission, assignment, review, decision,
 * revision, and acceptance — with immutable timestamps, reviewer anonymity
 * protections, and conflict-of-interest disclosure tracking.
 */

/**
 * Creates a peer-review submission record.
 * @param {object} input - Submission input.
 * @param {string} input.manuscriptId - Unique manuscript identifier.
 * @param {string} input.title - Manuscript title.
 * @param {string} [input.doi] - Preprint DOI (optional).
 * @param {string[]} input.authors - List of author names (or ORCID iDs).
 * @param {string} input.correspondingAuthor - Corresponding author identifier.
 * @param {string} input.journalId - Journal identifier (e.g. ISSN).
 * @param {string} [input.submittedAt] - ISO 8601 submission time (defaults to now).
 * @returns {object} The peer-review record.
 */
export function createSubmission(input) {
  if (!input || !input.manuscriptId || !input.title || !input.authors || !input.correspondingAuthor || !input.journalId) {
    throw new Error('Submission requires manuscriptId, title, authors, correspondingAuthor, and journalId');
  }
  const now = input.submittedAt || new Date().toISOString();
  return {
    manuscriptId: input.manuscriptId,
    title: input.title,
    doi: input.doi || null,
    authors: input.authors,
    correspondingAuthor: input.correspondingAuthor,
    journalId: input.journalId,
    status: 'submitted',
    submittedAt: now,
    reviewers: [],
    reviews: [],
    decisions: [],
    revisions: [],
    coiDeclarations: [],
    timeline: [{ event: 'submission', at: now }],
  };
}

/**
 * Assigns a reviewer to a submission, recording conflict-of-interest declaration.
 * @param {object} submission - The submission record.
 * @param {object} assignment - Reviewer assignment.
 * @param {string} assignment.reviewerId - Reviewer identifier (anonymized ORCID or internal ID).
 * @param {string} [assignment.anonymousCode] - Anonymized code for double-blind review.
 * @param {boolean} [assignment.coiDisclosed] - Whether COI was disclosed.
 * @param {string} [assignment.coiDescription] - Free-text COI description.
 * @param {string} [assignment.assignedAt] - ISO 8601 timestamp.
 * @returns {object} The updated submission.
 */
export function assignReviewer(submission, assignment) {
  if (!submission || !assignment || !assignment.reviewerId) {
    throw new Error('assignReviewer requires submission and assignment.reviewerId');
  }
  const now = assignment.assignedAt || new Date().toISOString();
  // Reject duplicate assignment
  if (submission.reviewers.some(r => r.reviewerId === assignment.reviewerId)) {
    throw new Error(`Reviewer ${assignment.reviewerId} already assigned to ${submission.manuscriptId}`);
  }
  // Reject author-as-reviewer (basic safeguard)
  if (submission.authors.includes(assignment.reviewerId)) {
    throw new Error(`Reviewer ${assignment.reviewerId} is an author of the manuscript — author-as-reviewer prohibited`);
  }
  submission.reviewers.push({
    reviewerId: assignment.reviewerId,
    anonymousCode: assignment.anonymousCode || null,
    coiDisclosed: !!assignment.coiDisclosed,
    coiDescription: assignment.coiDescription || null,
    assignedAt: now,
    status: 'assigned',
  });
  submission.timeline.push({ event: 'reviewer-assigned', reviewerId: assignment.reviewerId, at: now });
  if (submission.status === 'submitted') submission.status = 'under-review';
  return submission;
}

/**
 * Records a reviewer's review on a submission.
 * @param {object} submission - The submission record.
 * @param {object} review - Review data.
 * @param {string} review.reviewerId - Reviewer identifier (must be assigned).
 * @param {string} review.recommendation - One of: accept, minor-revision, major-revision, reject.
 * @param {string} [review.commentsToAuthor] - Comments visible to authors.
 * @param {string} [review.commentsToEditor] - Confidential comments to editor.
 * @param {string} [review.submittedAt] - ISO 8601 timestamp.
 * @returns {object} The updated submission.
 */
export function recordReview(submission, review) {
  if (!submission || !review || !review.reviewerId || !review.recommendation) {
    throw new Error('recordReview requires submission and review.reviewerId and review.recommendation');
  }
  const validRecs = ['accept', 'minor-revision', 'major-revision', 'reject'];
  if (!validRecs.includes(review.recommendation)) {
    throw new Error(`Recommendation must be one of: ${validRecs.join(', ')}`);
  }
  const reviewer = submission.reviewers.find(r => r.reviewerId === review.reviewerId);
  if (!reviewer) {
    throw new Error(`Reviewer ${review.reviewerId} is not assigned to ${submission.manuscriptId}`);
  }
  const now = review.submittedAt || new Date().toISOString();
  submission.reviews.push({
    reviewerId: review.reviewerId,
    recommendation: review.recommendation,
    commentsToAuthor: review.commentsToAuthor || null,
    commentsToEditor: review.commentsToEditor || null,
    submittedAt: now,
  });
  reviewer.status = 'reviewed';
  reviewer.reviewedAt = now;
  submission.timeline.push({
    event: 'review-submitted',
    reviewerId: review.reviewerId,
    recommendation: review.recommendation,
    at: now,
  });
  return submission;
}

/**
 * Records an editorial decision on a submission.
 * @param {object} submission - The submission record.
 * @param {object} decision - Editorial decision.
 * @param {string} decision.decision - One of: accept, minor-revision, major-revision, reject.
 * @param {string} decision.editorId - Editor identifier.
 * @param {string} [decision.justification] - Decision justification.
 * @param {string} [decision.decidedAt] - ISO 8601 timestamp.
 * @returns {object} The updated submission.
 */
export function recordDecision(submission, decision) {
  if (!submission || !decision || !decision.decision || !decision.editorId) {
    throw new Error('recordDecision requires submission, decision.decision, and decision.editorId');
  }
  const validDecisions = ['accept', 'minor-revision', 'major-revision', 'reject'];
  if (!validDecisions.includes(decision.decision)) {
    throw new Error(`Decision must be one of: ${validDecisions.join(', ')}`);
  }
  const now = decision.decidedAt || new Date().toISOString();
  submission.decisions.push({
    decision: decision.decision,
    editorId: decision.editorId,
    justification: decision.justification || null,
    decidedAt: now,
  });
  // Update submission status
  if (decision.decision === 'accept') submission.status = 'accepted';
  else if (decision.decision === 'reject') submission.status = 'rejected';
  else submission.status = 'revision-requested';
  submission.timeline.push({
    event: 'editor-decision',
    decision: decision.decision,
    editorId: decision.editorId,
    at: now,
  });
  return submission;
}

/**
 * Records a revision (resubmission after major/minor revision).
 * @param {object} submission - The submission record.
 * @param {object} revision - Revision info.
 * @param {string} [revision.responseToReviewers] - Author response document.
 * @param {string[]} [revision.changedSections] - List of changed section names.
 * @param {string} [revision.resubmittedAt] - ISO 8601 timestamp.
 * @returns {object} The updated submission.
 */
export function recordRevision(submission, revision = {}) {
  if (!submission) throw new Error('recordRevision requires submission');
  const now = revision.resubmittedAt || new Date().toISOString();
  submission.revisions.push({
    responseToReviewers: revision.responseToReviewers || null,
    changedSections: revision.changedSections || [],
    resubmittedAt: now,
  });
  submission.status = 'under-review';
  submission.timeline.push({ event: 'revision-submitted', at: now });
  return submission;
}

/**
 * Verifies the integrity of the peer-review timeline by checking that
 * all events are in chronological order and all required fields are present.
 * @param {object} submission - The submission record.
 * @returns {{ verified: boolean, issues: string[], eventCount: number }}
 */
export function verifyReviewIntegrity(submission) {
  if (!submission || !submission.timeline) {
    return { verified: false, issues: ['Submission missing timeline'], eventCount: 0 };
  }
  const issues = [];
  let prevTime = null;
  for (const event of submission.timeline) {
    if (!event.at || isNaN(Date.parse(event.at))) {
      issues.push(`Event "${event.event}" has invalid or missing timestamp`);
      continue;
    }
    if (prevTime && new Date(event.at) < new Date(prevTime)) {
      issues.push(`Event "${event.event}" at ${event.at} precedes prior event at ${prevTime}`);
    }
    prevTime = event.at;
  }
  // Verify reviewer/review consistency
  for (const review of submission.reviews) {
    const reviewer = submission.reviewers.find(r => r.reviewerId === review.reviewerId);
    if (!reviewer) {
      issues.push(`Review from unassigned reviewer ${review.reviewerId}`);
    }
  }
  return {
    verified: issues.length === 0,
    issues,
    eventCount: submission.timeline.length,
  };
}
