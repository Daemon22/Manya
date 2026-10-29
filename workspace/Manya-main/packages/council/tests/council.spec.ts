/**
 * @manya/council — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  // router
  SpecialistRegistry, route, routeAll, matchScore, validateSpecialist,
  // analysis
  AnalysisCollector, validateAnalysis,
  // scoring
  scoreAnalysis, aggregateScores, detectOutliers, DEFAULT_OUTLIER_THRESHOLD,
  // conflict
  ConflictDetector, severityFor,
  CONFLICT_TYPES, CONFLICT_SEVERITIES,
  OPPOSING_CONFIDENCE_THRESHOLD, FACTUAL_OVERLAP_THRESHOLD,
  DIVERGENT_REASONING_MAX_OVERLAP, SEVERITY_HIGH_GAP, SEVERITY_MEDIUM_GAP,
  // debate
  DebateFacilitator, validateRound, DEFAULT_MAX_DEBATE_ROUNDS,
  // minority
  MinorityOpinionTracker, validateMinorityOpinion,
  // consensus
  ConsensusBuilder, DEFAULT_CONSENSUS_THRESHOLD,
  // reports
  buildReport, serializeReport, summarizeReport,
  // synthesizer
  synthesize, classifyConsensus,
  DEFAULT_SYNTHESIS_THRESHOLD, STRONG_CONSENSUS_RATIO,
  // errors
  CouncilError, RoutingError, AnalysisError, ScoringError,
  ConflictError, DebateError, ConsensusError, SynthesisError,
  // logging
  shouldScrubField, scrubMetadata, SCRUBBED_FIELD_NAMES,
} from '../src';
import type {
  Analysis, Conflict, DebateRound, MinorityOpinion, Problem, Specialist,
} from '../src';

const NOW = '2024-06-01T00:00:00.000Z';

function problem(id: string, description: string, domain: string): Problem {
  return { id, description, domain, createdAt: NOW };
}

function specialist(
  id: string, expertise: string[], weight = 1, name?: string,
): Specialist {
  return { id, name: name ?? id, expertise, weight };
}

function analysis(
  id: string, specialistId: string, problemId: string,
  content: string, confidence: number, reasoning: string,
  caveats?: string[],
): Analysis {
  return { id, specialistId, problemId, content, confidence, reasoning, caveats };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

describe('router', () => {
  describe('validateSpecialist', () => {
    test('accepts a valid specialist', () => {
      expect(() => validateSpecialist(specialist('a', ['x']))).not.toThrow();
    });
    test('rejects non-object', () => {
      expect(() => validateSpecialist(null as unknown as Specialist)).toThrow(RoutingError);
    });
    test('rejects empty id', () => {
      expect(() => validateSpecialist({ ...specialist('a', ['x']), id: '' })).toThrow(RoutingError);
    });
    test('rejects empty name', () => {
      expect(() => validateSpecialist({ ...specialist('a', ['x']), name: '' })).toThrow(RoutingError);
    });
    test('rejects non-array expertise', () => {
      expect(() => validateSpecialist({ ...specialist('a', ['x']), expertise: 'x' as unknown as string[] }))
        .toThrow(RoutingError);
    });
    test('rejects negative weight', () => {
      expect(() => validateSpecialist({ ...specialist('a', ['x']), weight: -1 })).toThrow(RoutingError);
    });
  });

  describe('matchScore', () => {
    test('returns 0 when no overlap', () => {
      const s = specialist('a', ['security', 'crypto']);
      const p = problem('p1', 'audit the budget', 'finance');
      expect(matchScore(p, s)).toBe(0);
    });
    test('returns > 0 when there is overlap', () => {
      const s = specialist('a', ['security', 'crypto']);
      const p = problem('p1', 'audit the crypto security', 'security');
      expect(matchScore(p, s)).toBeGreaterThan(0);
    });
    test('returns 0 when specialist has no expertise', () => {
      const s = specialist('a', []);
      const p = problem('p1', 'audit the security', 'security');
      expect(matchScore(p, s)).toBe(0);
    });
  });

  describe('route', () => {
    test('returns ranked specialists by score, best-first', () => {
      const sec = specialist('sec', ['security', 'crypto'], 1);
      const fin = specialist('fin', ['finance', 'audit'], 1);
      const ops = specialist('ops', ['operations'], 1);
      const p = problem('p1', 'audit the crypto security budget', 'security');
      const ranked = route(p, [fin, ops, sec]);
      // sec has the strongest overlap (security+crypto), fin has 'audit' overlap, ops has none.
      expect(ranked[0].id).toBe('sec');
      expect(ranked[1].id).toBe('fin');
      expect(ranked).not.toContain(ops);
    });
    test('excludes specialists with zero overlap', () => {
      const a = specialist('a', ['x']);
      const b = specialist('b', ['y']);
      const p = problem('p', 'x is the topic', 'domain');
      const ranked = route(p, [a, b]);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('a');
    });
    test('breaks ties by descending weight', () => {
      const a = specialist('a', ['x'], 1);
      const b = specialist('b', ['x'], 5);
      const p = problem('p', 'x topic', 'domain');
      const ranked = route(p, [a, b]);
      expect(ranked[0].id).toBe('b');
      expect(ranked[1].id).toBe('a');
    });
    test('throws on non-array specialists', () => {
      expect(() => route(problem('p', 'd', 'dom'), 'nope' as unknown as Specialist[]))
        .toThrow(RoutingError);
    });
  });

  describe('routeAll', () => {
    test('includes specialists with score 0', () => {
      const a = specialist('a', ['x']);
      const b = specialist('b', ['y']);
      const p = problem('p', 'x topic', 'domain');
      const all = routeAll(p, [a, b]);
      expect(all).toHaveLength(2);
      expect(all[0].specialist.id).toBe('a');
      expect(all[0].score).toBeGreaterThan(0);
      expect(all[1].score).toBe(0);
    });
  });

  describe('SpecialistRegistry', () => {
    test('register/get/unregister/list', () => {
      const reg = new SpecialistRegistry();
      const a = specialist('a', ['x']);
      reg.register(a);
      expect(reg.get('a')).toBe(a);
      expect(reg.list()).toHaveLength(1);
      reg.unregister('a');
      expect(reg.get('a')).toBeUndefined();
      expect(reg.list()).toHaveLength(0);
    });
    test('register rejects duplicate id', () => {
      const reg = new SpecialistRegistry();
      reg.register(specialist('a', ['x']));
      expect(() => reg.register(specialist('a', ['y']))).toThrow(RoutingError);
    });
    test('route uses the registered pool', () => {
      const reg = new SpecialistRegistry()
        .register(specialist('sec', ['security', 'crypto']))
        .register(specialist('fin', ['finance']));
      const p = problem('p', 'crypto security issue', 'security');
      const ranked = reg.route(p);
      expect(ranked.map((s) => s.id)).toEqual(['sec']);
    });
    test('routeAll returns matches with scores', () => {
      const reg = new SpecialistRegistry()
        .register(specialist('sec', ['security']))
        .register(specialist('fin', ['finance']));
      const p = problem('p', 'security issue', 'security');
      const all = reg.routeAll(p);
      expect(all).toHaveLength(2);
      expect(all[0].score).toBeGreaterThan(all[1].score);
    });
  });
});

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

describe('analysis', () => {
  describe('validateAnalysis', () => {
    test('accepts a valid analysis', () => {
      expect(() => validateAnalysis(analysis('a1', 's1', 'p1', 'content', 0.5, 'because')))
        .not.toThrow();
    });
    test('rejects confidence out of range', () => {
      expect(() => validateAnalysis(analysis('a1', 's1', 'p1', 'c', 1.5, 'r')))
        .toThrow(AnalysisError);
      expect(() => validateAnalysis(analysis('a1', 's1', 'p1', 'c', -0.1, 'r')))
        .toThrow(AnalysisError);
    });
    test('rejects empty reasoning', () => {
      expect(() => validateAnalysis(analysis('a1', 's1', 'p1', 'c', 0.5, '')))
        .toThrow(AnalysisError);
    });
    test('rejects non-array caveats', () => {
      expect(() => validateAnalysis(analysis('a1', 's1', 'p1', 'c', 0.5, 'r', 'oops' as unknown as string[])))
        .toThrow(AnalysisError);
    });
  });

  describe('AnalysisCollector', () => {
    test('submit + getAll + getBySpecialist', () => {
      const c = new AnalysisCollector();
      c.submit(analysis('a1', 'sec', 'p1', 'c1', 0.5, 'r1'));
      c.submit(analysis('a2', 'fin', 'p1', 'c2', 0.7, 'r2'));
      c.submit(analysis('a3', 'sec', 'p2', 'c3', 0.9, 'r3'));
      expect(c.getAll('p1')).toHaveLength(2);
      expect(c.getBySpecialist('sec')).toHaveLength(2);
      expect(c.getBySpecialist('fin')).toHaveLength(1);
    });
    test('rejects duplicate id', () => {
      const c = new AnalysisCollector();
      c.submit(analysis('a1', 'sec', 'p1', 'c1', 0.5, 'r1'));
      expect(() => c.submit(analysis('a1', 'fin', 'p1', 'c2', 0.7, 'r2')))
        .toThrow(AnalysisError);
    });
    test('list returns all in submission order', () => {
      const c = new AnalysisCollector();
      c.submit(analysis('a1', 's', 'p', 'c', 0.1, 'r'));
      c.submit(analysis('a2', 's', 'p', 'c', 0.2, 'r'));
      expect(c.list().map((a) => a.id)).toEqual(['a1', 'a2']);
    });
    test('size counts analyses', () => {
      const c = new AnalysisCollector();
      c.submit(analysis('a1', 's', 'p', 'c', 0.1, 'r'));
      c.submit(analysis('a2', 's', 'p', 'c', 0.2, 'r'));
      expect(c.size()).toBe(2);
    });
    test('get returns undefined for unknown id', () => {
      const c = new AnalysisCollector();
      expect(c.get('nope')).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('scoring', () => {
  describe('scoreAnalysis', () => {
    test('returns raw * weight', () => {
      const a = analysis('a1', 's', 'p', 'c', 0.5, 'r');
      const s = scoreAnalysis(a, 2);
      expect(s.weighted).toBe(1);
      expect(s.raw).toBe(0.5);
      expect(s.weight).toBe(2);
      expect(s.analysisId).toBe('a1');
    });
    test('rejects invalid weight', () => {
      const a = analysis('a1', 's', 'p', 'c', 0.5, 'r');
      expect(() => scoreAnalysis(a, -1)).toThrow(ScoringError);
      expect(() => scoreAnalysis(a, NaN)).toThrow(ScoringError);
    });
    test('rejects invalid analysis', () => {
      expect(() => scoreAnalysis(null as unknown as Analysis, 1)).toThrow(ScoringError);
    });
  });

  describe('aggregateScores', () => {
    test('returns combined weighted mean and dispersion', () => {
      const a1 = analysis('a1', 's', 'p', 'c', 0.8, 'r');
      const a2 = analysis('a2', 's', 'p', 'c', 0.6, 'r');
      const agg = aggregateScores([a1, a2], { s: 1 });
      // combined = (0.8 + 0.6) / 2 = 0.7
      expect(agg.combined).toBeCloseTo(0.7, 5);
      // variance of [0.8, 0.6] = ((0.8-0.7)^2 + (0.6-0.7)^2) / 2 = 0.01
      expect(agg.variance).toBeCloseTo(0.01, 5);
      expect(agg.stddev).toBeCloseTo(0.1, 5);
      expect(agg.total).toBe(2);
    });
    test('respects specialist weights', () => {
      const a1 = analysis('a1', 'x', 'p', 'c', 0.8, 'r');
      const a2 = analysis('a2', 'y', 'p', 'c', 0.4, 'r');
      const agg = aggregateScores([a1, a2], { x: 3, y: 1 });
      // (0.8*3 + 0.4*1) / (3 + 1) = 2.8 / 4 = 0.7
      expect(agg.combined).toBeCloseTo(0.7, 5);
    });
    test('returns zeros for empty input', () => {
      const agg = aggregateScores([], {});
      expect(agg.combined).toBe(0);
      expect(agg.total).toBe(0);
    });
    test('throws on missing weight', () => {
      const a1 = analysis('a1', 'x', 'p', 'c', 0.8, 'r');
      expect(() => aggregateScores([a1], {})).toThrow(ScoringError);
    });
  });

  describe('detectOutliers', () => {
    test('returns analyses far from the median', () => {
      const arr = [
        analysis('a1', 's', 'p', 'c', 0.5, 'r'),
        analysis('a2', 's', 'p', 'c', 0.55, 'r'),
        analysis('a3', 's', 'p', 'c', 0.9, 'r'),
      ];
      // median of [0.5, 0.55, 0.9] = 0.55; with threshold 0.2, a3 (0.9) deviates 0.35
      const out = detectOutliers(arr, 0.2);
      expect(out.map((a) => a.id)).toEqual(['a3']);
    });
    test('returns [] for fewer than 2 analyses', () => {
      expect(detectOutliers([], 0.2)).toEqual([]);
      expect(detectOutliers([analysis('a1', 's', 'p', 'c', 0.5, 'r')], 0.2)).toEqual([]);
    });
    test('uses default threshold when omitted', () => {
      expect(DEFAULT_OUTLIER_THRESHOLD).toBe(0.25);
      const arr = [
        analysis('a1', 's', 'p', 'c', 0.5, 'r'),
        analysis('a2', 's', 'p', 'c', 0.5, 'r'),
        analysis('a3', 's', 'p', 'c', 0.9, 'r'),
      ];
      const out = detectOutliers(arr);
      expect(out.map((a) => a.id)).toEqual(['a3']);
    });
    test('rejects negative threshold', () => {
      expect(() => detectOutliers([], -0.1)).toThrow(ScoringError);
    });
  });
});

// ---------------------------------------------------------------------------
// Conflict
// ---------------------------------------------------------------------------

describe('conflict', () => {
  describe('constants', () => {
    test('CONFLICT_TYPES has all 3 types', () => {
      expect(CONFLICT_TYPES).toEqual([
        'opposing_conclusion', 'factual_contradiction', 'divergent_reasoning',
      ]);
    });
    test('CONFLICT_SEVERITIES has low/medium/high', () => {
      expect(CONFLICT_SEVERITIES).toEqual(['low', 'medium', 'high']);
    });
    test('OPPOSING_CONFIDENCE_THRESHOLD is 0.6', () => {
      expect(OPPOSING_CONFIDENCE_THRESHOLD).toBe(0.6);
    });
    test('FACTUAL_OVERLAP_THRESHOLD is 0.3', () => {
      expect(FACTUAL_OVERLAP_THRESHOLD).toBe(0.3);
    });
    test('DIVERGENT_REASONING_MAX_OVERLAP is 0.2', () => {
      expect(DIVERGENT_REASONING_MAX_OVERLAP).toBe(0.2);
    });
  });

  describe('severityFor', () => {
    test('high when 3+ analyses', () => {
      expect(severityFor(3, 0.1)).toBe('high');
    });
    test('high when confidence gap >= 0.5', () => {
      expect(severityFor(2, SEVERITY_HIGH_GAP)).toBe('high');
    });
    test('medium when confidence gap >= 0.2', () => {
      expect(severityFor(2, SEVERITY_MEDIUM_GAP)).toBe('medium');
    });
    test('low otherwise', () => {
      expect(severityFor(2, 0.05)).toBe('low');
    });
  });

  describe('ConflictDetector', () => {
    test('returns [] for fewer than 2 analyses', () => {
      const d = new ConflictDetector();
      expect(d.detect([])).toEqual([]);
      expect(d.detect([analysis('a1', 's', 'p', 'c', 0.5, 'r')])).toEqual([]);
    });
    test('detects opposing_conclusion', () => {
      const d = new ConflictDetector();
      const a1 = analysis('a1', 'x', 'p1', 'I recommend we adopt the proposal.', 0.9, 'reasoning one');
      const a2 = analysis('a2', 'y', 'p1', 'I reject the proposal.', 0.9, 'reasoning two');
      const conflicts = d.detect([a1, a2]);
      const opposing = conflicts.filter((c) => c.type === 'opposing_conclusion');
      expect(opposing).toHaveLength(1);
      expect(opposing[0].analysisIds).toEqual(['a1', 'a2']);
      expect(opposing[0].problemId).toBe('p1');
    });
    test('does not flag opposing when one confidence is low', () => {
      const d = new ConflictDetector();
      const a1 = analysis('a1', 'x', 'p1', 'I recommend we adopt the proposal.', 0.9, 'r');
      const a2 = analysis('a2', 'y', 'p1', 'I reject the proposal.', 0.4, 'r');
      const conflicts = d.detect([a1, a2]).filter((c) => c.type === 'opposing_conclusion');
      expect(conflicts).toHaveLength(0);
    });
    test('detects factual_contradiction', () => {
      const d = new ConflictDetector();
      // Both confident and opposed, AND content shares substantial overlap.
      const a1 = analysis('a1', 'x', 'p1',
        'The crypto security audit recommends we adopt the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'y', 'p1',
        'The crypto security audit rejects the proposal.', 0.9, 'r2');
      const conflicts = d.detect([a1, a2]);
      expect(conflicts.some((c) => c.type === 'factual_contradiction')).toBe(true);
    });
    test('detects divergent_reasoning', () => {
      const d = new ConflictDetector();
      // Same polarity, similar content (overlap > 0.1), very different reasoning.
      const a1 = analysis('a1', 'x', 'p1',
        'I recommend we adopt the crypto proposal because it is sound.',
        0.8,
        'Tests pass and risks are low.');
      const a2 = analysis('a2', 'y', 'p1',
        'I recommend we adopt the crypto proposal because it is safe.',
        0.8,
        'Budget is available and the timeline is short.');
      const conflicts = d.detect([a1, a2]);
      const divergent = conflicts.filter((c) => c.type === 'divergent_reasoning');
      expect(divergent.length).toBeGreaterThan(0);
    });
    test('does not compare analyses from different problems', () => {
      const d = new ConflictDetector();
      const a1 = analysis('a1', 'x', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'y', 'p2', 'I reject the proposal.', 0.9, 'r2');
      expect(d.detect([a1, a2])).toHaveLength(0);
    });
    test('conflicts have stable deterministic ids', () => {
      const d = new ConflictDetector();
      const a1 = analysis('a1', 'x', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'y', 'p1', 'I reject the proposal.', 0.9, 'r2');
      const cs = d.detect([a1, a2]);
      const cs2 = d.detect([a1, a2]);
      expect(cs.map((c) => c.id)).toEqual(cs2.map((c) => c.id));
    });
    test('throws on non-array input', () => {
      const d = new ConflictDetector();
      expect(() => d.detect('nope' as unknown as Analysis[])).toThrow(ConflictError);
    });
    test('high severity when confidence gap is large', () => {
      const d = new ConflictDetector();
      // Two confident opposing analyses with very different confidence values.
      const a1 = analysis('a1', 'x', 'p1', 'I recommend we adopt.', 0.95, 'r1');
      const a2 = analysis('a2', 'y', 'p1', 'I reject the proposal.', 0.61, 'r2');
      // confidence gap = 0.34 → medium severity (between 0.2 and 0.5)
      const conflicts = d.detect([a1, a2]).filter((c) => c.type === 'opposing_conclusion');
      expect(conflicts[0].severity).toBe('medium');
    });
  });
});

// ---------------------------------------------------------------------------
// Debate
// ---------------------------------------------------------------------------

describe('debate', () => {
  describe('validateRound', () => {
    test('accepts a valid round', () => {
      expect(() => validateRound({
        id: 'r1', analystId: 's', claim: 'claim', evidence: 'ev',
      })).not.toThrow();
    });
    test('rejects empty claim', () => {
      expect(() => validateRound({
        id: 'r1', analystId: 's', claim: '', evidence: 'ev',
      })).toThrow(DebateError);
    });
    test('rejects empty evidence', () => {
      expect(() => validateRound({
        id: 'r1', analystId: 's', claim: 'x', evidence: '',
      })).toThrow(DebateError);
    });
  });

  describe('DebateFacilitator', () => {
    test('open returns an empty open debate', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', ['c1']);
      expect(d.status).toBe('open');
      expect(d.rounds).toEqual([]);
      expect(d.problemId).toBe('p1');
      expect(d.conflictIds).toEqual(['c1']);
      expect(d.openedAt).toBeTruthy();
    });
    test('submitRound appends a round', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      const r: DebateRound = {
        id: 'r1', analystId: 'sec', claim: 'The proposal is sound.',
        evidence: 'Tests pass and risks are low.',
      };
      f.submitRound(d.id, r);
      expect(f.get(d.id)!.rounds).toHaveLength(1);
    });
    test('submitRound with rebuttalTo references an existing round', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      f.submitRound(d.id, {
        id: 'r1', analystId: 'sec', claim: 'A', evidence: 'B',
      });
      f.submitRound(d.id, {
        id: 'r2', analystId: 'fin', claim: 'C', evidence: 'D', rebuttalTo: 'r1',
      });
      expect(f.get(d.id)!.rounds).toHaveLength(2);
    });
    test('submitRound rejects rebuttalTo to a non-existent round', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      expect(() => f.submitRound(d.id, {
        id: 'r1', analystId: 's', claim: 'x', evidence: 'y', rebuttalTo: 'nope',
      })).toThrow(DebateError);
    });
    test('submitRound rejects duplicate round id', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      f.submitRound(d.id, { id: 'r1', analystId: 's', claim: 'x', evidence: 'y' });
      expect(() => f.submitRound(d.id, { id: 'r1', analystId: 's', claim: 'x', evidence: 'y' }))
        .toThrow(DebateError);
    });
    test('submitRound rejects rounds after conclude', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      f.conclude(d.id);
      expect(() => f.submitRound(d.id, {
        id: 'r1', analystId: 's', claim: 'x', evidence: 'y',
      })).toThrow(DebateError);
    });
    test('conclude sets status and concludedAt', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      const c = f.conclude(d.id);
      expect(c.status).toBe('concluded');
      expect(c.concludedAt).toBeTruthy();
    });
    test('conclude rejects already-concluded debate', () => {
      const f = new DebateFacilitator();
      const d = f.open('p1', []);
      f.conclude(d.id);
      expect(() => f.conclude(d.id)).toThrow(DebateError);
    });
    test('throws when maxRounds reached', () => {
      const f = new DebateFacilitator(2);
      const d = f.open('p1', []);
      f.submitRound(d.id, { id: 'r1', analystId: 's', claim: 'x', evidence: 'y' });
      f.submitRound(d.id, { id: 'r2', analystId: 's', claim: 'x', evidence: 'y' });
      expect(() => f.submitRound(d.id, { id: 'r3', analystId: 's', claim: 'x', evidence: 'y' }))
        .toThrow(DebateError);
    });
    test('DEFAULT_MAX_DEBATE_ROUNDS is 10', () => {
      expect(DEFAULT_MAX_DEBATE_ROUNDS).toBe(10);
    });
    test('constructor rejects non-positive maxRounds', () => {
      expect(() => new DebateFacilitator(0)).toThrow(DebateError);
    });
    test('list returns all debates in opening order', () => {
      const f = new DebateFacilitator();
      const d1 = f.open('p1', []);
      const d2 = f.open('p2', []);
      expect(f.list().map((d) => d.id)).toEqual([d1.id, d2.id]);
    });
    test('open rejects empty problemId', () => {
      const f = new DebateFacilitator();
      expect(() => f.open('', [])).toThrow(DebateError);
    });
  });
});

// ---------------------------------------------------------------------------
// Minority
// ---------------------------------------------------------------------------

describe('minority', () => {
  describe('validateMinorityOpinion', () => {
    test('accepts a valid opinion', () => {
      expect(() => validateMinorityOpinion({
        id: 'm1', problemId: 'p1', analystId: 'fin',
        position: 'reject', reasoning: 'cost', dissentReason: 'budget ignored',
      })).not.toThrow();
    });
    test('rejects empty position', () => {
      expect(() => validateMinorityOpinion({
        id: 'm1', problemId: 'p1', analystId: 'fin',
        position: '', reasoning: 'cost', dissentReason: 'x',
      })).toThrow(CouncilError);
    });
    test('rejects empty dissentReason', () => {
      expect(() => validateMinorityOpinion({
        id: 'm1', problemId: 'p1', analystId: 'fin',
        position: 'p', reasoning: 'r', dissentReason: '',
      })).toThrow(CouncilError);
    });
  });

  describe('MinorityOpinionTracker', () => {
    function mo(id: string, problemId: string, analystId: string): MinorityOpinion {
      return {
        id, problemId, analystId,
        position: 'reject', reasoning: 'cost', dissentReason: 'budget',
      };
    }
    test('record + getForProblem + getByAnalyst', () => {
      const t = new MinorityOpinionTracker();
      t.record(mo('m1', 'p1', 'fin'));
      t.record(mo('m2', 'p1', 'sec'));
      t.record(mo('m3', 'p2', 'fin'));
      expect(t.getForProblem('p1')).toHaveLength(2);
      expect(t.getByAnalyst('fin')).toHaveLength(2);
      expect(t.getForProblem('p2')).toHaveLength(1);
    });
    test('rejects duplicate id', () => {
      const t = new MinorityOpinionTracker();
      t.record(mo('m1', 'p1', 'fin'));
      expect(() => t.record(mo('m1', 'p2', 'sec'))).toThrow(CouncilError);
    });
    test('list returns all in record order', () => {
      const t = new MinorityOpinionTracker();
      t.record(mo('m1', 'p1', 'fin'));
      t.record(mo('m2', 'p1', 'sec'));
      expect(t.list().map((o) => o.id)).toEqual(['m1', 'm2']);
    });
    test('size counts opinions', () => {
      const t = new MinorityOpinionTracker();
      t.record(mo('m1', 'p1', 'fin'));
      t.record(mo('m2', 'p1', 'sec'));
      expect(t.size()).toBe(2);
    });
    test('get returns undefined for unknown id', () => {
      const t = new MinorityOpinionTracker();
      expect(t.get('nope')).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Consensus
// ---------------------------------------------------------------------------

describe('consensus', () => {
  describe('ConsensusBuilder', () => {
    test('reaches consensus when weighted support >= threshold', () => {
      const b = new ConsensusBuilder(0.6);
      const a1 = analysis('a1', 'sec', 'p1', 'I recommend we adopt the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I support the proposal.', 0.8, 'r2');
      const c = b.build('p1', [a1, a2], []);
      expect(c).not.toBeNull();
      expect(c!.decision).toContain('Adopt');
      expect(c!.supportingAnalystIds).toContain('sec');
      expect(c!.supportingAnalystIds).toContain('fin');
      expect(c!.dissentingAnalystIds).toEqual([]);
      expect(c!.confidence).toBeGreaterThan(0.6);
    });
    test('returns null when no analyses', () => {
      const b = new ConsensusBuilder();
      expect(b.build('p1', [], [])).toBeNull();
    });
    test('returns null when no analysis has a stance', () => {
      const b = new ConsensusBuilder();
      const a1 = analysis('a1', 's', 'p1', 'The sky is blue.', 0.5, 'r1');
      expect(b.build('p1', [a1], [])).toBeNull();
    });
    test('returns null when support is below threshold', () => {
      const b = new ConsensusBuilder(0.9);
      const a1 = analysis('a1', 'sec', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I reject the proposal.', 0.9, 'r2');
      // Both weight 1, confidence 0.9 → 50/50 split → ratio 0.5 < 0.9.
      expect(b.build('p1', [a1, a2], [])).toBeNull();
    });
    test('reject decision when negative polarity wins', () => {
      const b = new ConsensusBuilder(0.6);
      const a1 = analysis('a1', 'sec', 'p1', 'I reject the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I oppose the proposal.', 0.9, 'r2');
      const c = b.build('p1', [a1, a2], []);
      expect(c).not.toBeNull();
      expect(c!.decision).toContain('Reject');
    });
    test('respects specialist weights', () => {
      const b = new ConsensusBuilder(0.6);
      const a1 = analysis('a1', 'heavy', 'p1', 'I reject the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'light', 'p1', 'I recommend the proposal.', 0.9, 'r2');
      const a3 = analysis('a3', 'light', 'p1', 'I support the proposal.', 0.9, 'r3');
      // heavy gets weight 10; lights get weight 1.
      // reject: 0.9*10 = 9; recommend+support: 0.9+0.9 = 1.8 → ratio = 9 / 10.8 = 0.833.
      const c = b.build('p1', [a1, a2, a3], [], { weights: { heavy: 10, light: 1 } });
      expect(c).not.toBeNull();
      expect(c!.decision).toContain('Reject');
    });
    test('includes conflictsResolved from conflicts for the problem', () => {
      const b = new ConsensusBuilder();
      const a1 = analysis('a1', 'sec', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I support the proposal.', 0.9, 'r2');
      const conflicts: Conflict[] = [{
        id: 'c1', problemId: 'p1', analysisIds: ['a1', 'a2'],
        description: 'd', severity: 'low', type: 'opposing_conclusion',
      }];
      const c = b.build('p1', [a1, a2], conflicts);
      expect(c!.conflictsResolved).toEqual(['c1']);
    });
    test('openIssues lists high-severity conflicts', () => {
      const b = new ConsensusBuilder();
      const a1 = analysis('a1', 'sec', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I support the proposal.', 0.9, 'r2');
      const conflicts: Conflict[] = [{
        id: 'c1', problemId: 'p1', analysisIds: ['a1', 'a2'],
        description: 'big problem', severity: 'high', type: 'opposing_conclusion',
      }];
      const c = b.build('p1', [a1, a2], conflicts);
      expect(c!.openIssues.length).toBeGreaterThan(0);
      expect(c!.openIssues[0]).toContain('c1');
    });
    test('minorityAnalystIds are added to dissentingAnalystIds', () => {
      const b = new ConsensusBuilder();
      const a1 = analysis('a1', 'sec', 'p1', 'I recommend the proposal.', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'I support the proposal.', 0.9, 'r2');
      const c = b.build('p1', [a1, a2], [], { minorityAnalystIds: ['legal'] });
      expect(c!.dissentingAnalystIds).toContain('legal');
    });
    test('constructor rejects out-of-range threshold', () => {
      expect(() => new ConsensusBuilder(1.5)).toThrow(ConsensusError);
      expect(() => new ConsensusBuilder(-0.1)).toThrow(ConsensusError);
    });
    test('DEFAULT_CONSENSUS_THRESHOLD is 0.6', () => {
      expect(DEFAULT_CONSENSUS_THRESHOLD).toBe(0.6);
    });
    test('getThreshold returns configured threshold', () => {
      expect(new ConsensusBuilder(0.7).getThreshold()).toBe(0.7);
      expect(new ConsensusBuilder().getThreshold()).toBe(0.6);
    });
  });
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

describe('reports', () => {
  test('buildReport aggregates everything', () => {
    const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.9, 'r');
    const conflict: Conflict = {
      id: 'c1', problemId: 'p1', analysisIds: ['a1'],
      description: 'd', severity: 'low', type: 'opposing_conclusion',
    };
    const consensus = {
      problemId: 'p1', decision: 'Adopt', confidence: 0.85,
      supportingAnalystIds: ['sec'], dissentingAnalystIds: [],
      conflictsResolved: ['c1'], openIssues: [],
    };
    const r = buildReport({
      problemId: 'p1',
      analyses: [a1],
      conflicts: [conflict],
      debates: [],
      minorityOpinions: [],
      consensus,
      recommendations: ['Ship it'],
    });
    expect(r.problemId).toBe('p1');
    expect(r.analyses).toHaveLength(1);
    expect(r.conflicts).toHaveLength(1);
    expect(r.consensus).toBe(consensus);
    expect(r.recommendations).toEqual(['Ship it']);
    expect(r.summary).toContain('1 analysis');
    expect(r.summary).toContain('1 conflict');
    expect(r.summary).toContain('Consensus reached');
  });
  test('buildReport works with defaults for omitted fields', () => {
    const r = buildReport({ problemId: 'p1', analyses: [] });
    expect(r.conflicts).toEqual([]);
    expect(r.debates).toEqual([]);
    expect(r.minorityOpinions).toEqual([]);
    expect(r.recommendations).toEqual([]);
    expect(r.consensus).toBeNull();
    expect(r.summary).toContain('No conflicts');
    expect(r.summary).toContain('No consensus');
  });
  test('buildReport rejects empty problemId', () => {
    expect(() => buildReport({ problemId: '', analyses: [] })).toThrow(CouncilError);
  });
  test('serializeReport produces valid JSON', () => {
    const r = buildReport({ problemId: 'p1', analyses: [] });
    const s = serializeReport(r);
    const parsed = JSON.parse(s);
    expect(parsed.problemId).toBe('p1');
  });
  test('serializeReport throws on non-object', () => {
    expect(() => serializeReport(null as unknown as ReturnType<typeof buildReport>))
      .toThrow(CouncilError);
  });
  test('summarizeReport produces a single paragraph', () => {
    const r = buildReport({
      problemId: 'p1', analyses: [analysis('a1', 's', 'p1', 'c', 0.5, 'r')],
      recommendations: ['Do X'],
    });
    const s = summarizeReport(r);
    expect(typeof s).toBe('string');
    expect(s).toContain('p1');
    expect(s).toContain('1 analyses');
    expect(s).toContain('No consensus');
    expect(s).toContain('Do X');
  });
  test('summarizeReport includes decision when consensus exists', () => {
    const r = buildReport({
      problemId: 'p1',
      analyses: [analysis('a1', 's', 'p1', 'c', 0.9, 'r')],
      consensus: {
        problemId: 'p1', decision: 'Adopt it', confidence: 0.85,
        supportingAnalystIds: ['s'], dissentingAnalystIds: [],
        conflictsResolved: [], openIssues: [],
      },
    });
    const s = summarizeReport(r);
    expect(s).toContain('Adopt it');
    expect(s).toContain('85.0%');
  });
});

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------

describe('synthesizer', () => {
  describe('classifyConsensus', () => {
    test('returns none for null consensus', () => {
      expect(classifyConsensus(null)).toBe('none');
    });
    test('returns unanimous when no dissenters', () => {
      const c = {
        problemId: 'p', decision: 'd', confidence: 0.9,
        supportingAnalystIds: ['a', 'b'], dissentingAnalystIds: [],
        conflictsResolved: [], openIssues: [],
      };
      expect(classifyConsensus(c)).toBe('unanimous');
    });
    test('returns strong when confidence >= 0.8', () => {
      const c = {
        problemId: 'p', decision: 'd', confidence: 0.85,
        supportingAnalystIds: ['a', 'b', 'c'], dissentingAnalystIds: ['d'],
        conflictsResolved: [], openIssues: [],
      };
      expect(classifyConsensus(c)).toBe('strong');
    });
    test('returns majority when confidence >= 0.6', () => {
      const c = {
        problemId: 'p', decision: 'd', confidence: 0.65,
        supportingAnalystIds: ['a', 'b'], dissentingAnalystIds: ['c'],
        conflictsResolved: [], openIssues: [],
      };
      expect(classifyConsensus(c)).toBe('majority');
    });
    test('returns split when confidence < 0.6', () => {
      const c = {
        problemId: 'p', decision: 'd', confidence: 0.55,
        supportingAnalystIds: ['a'], dissentingAnalystIds: ['b'],
        conflictsResolved: [], openIssues: [],
      };
      expect(classifyConsensus(c)).toBe('split');
    });
  });

  describe('synthesize', () => {
    test('produces a decision with rationale', () => {
      const consensus = {
        problemId: 'p1', decision: 'Adopt the proposal.', confidence: 0.85,
        supportingAnalystIds: ['sec', 'fin'], dissentingAnalystIds: ['legal'],
        conflictsResolved: ['c1'], openIssues: [],
      };
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.9, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'support', 0.8, 'r2');
      const a3 = analysis('a3', 'legal', 'p1', 'reject', 0.7, 'r3');
      const d = synthesize('p1', consensus, [a1, a2, a3], []);
      expect(d.problemId).toBe('p1');
      expect(d.decision).toBe('Adopt the proposal.');
      expect(d.consensusLevel).toBe('strong');
      expect(d.confidence).toBe(0.85);
      expect(d.participants).toEqual(expect.arrayContaining(['sec', 'fin', 'legal']));
      expect(d.rationale).toContain('2 supporting');
      expect(d.rationale).toContain('1 dissenting');
      expect(d.generatedAt).toBeTruthy();
    });
    test('no-consensus decision has level none and confidence 0', () => {
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.9, 'r1');
      const d = synthesize('p1', null, [a1], []);
      expect(d.consensusLevel).toBe('none');
      expect(d.confidence).toBe(0);
      expect(d.decision).toContain('No actionable decision');
    });
    test('unanimous level when no dissent', () => {
      const consensus = {
        problemId: 'p1', decision: 'Adopt', confidence: 1.0,
        supportingAnalystIds: ['sec'], dissentingAnalystIds: [],
        conflictsResolved: [], openIssues: [],
      };
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.9, 'r1');
      const d = synthesize('p1', consensus, [a1], []);
      expect(d.consensusLevel).toBe('unanimous');
    });
    test('split level when consensus exists but weak', () => {
      const consensus = {
        problemId: 'p1', decision: 'Adopt', confidence: 0.55,
        supportingAnalystIds: ['sec'], dissentingAnalystIds: ['fin'],
        conflictsResolved: [], openIssues: [],
      };
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.6, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'reject', 0.5, 'r2');
      const d = synthesize('p1', consensus, [a1, a2], []);
      expect(d.consensusLevel).toBe('split');
    });
    test('majority level', () => {
      const consensus = {
        problemId: 'p1', decision: 'Adopt', confidence: 0.65,
        supportingAnalystIds: ['sec', 'fin'], dissentingAnalystIds: ['legal'],
        conflictsResolved: [], openIssues: [],
      };
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.7, 'r1');
      const a2 = analysis('a2', 'fin', 'p1', 'support', 0.6, 'r2');
      const a3 = analysis('a3', 'legal', 'p1', 'reject', 0.5, 'r3');
      const d = synthesize('p1', consensus, [a1, a2, a3], []);
      expect(d.consensusLevel).toBe('majority');
    });
    test('folds minority opinions into rationale', () => {
      const consensus = {
        problemId: 'p1', decision: 'Adopt', confidence: 0.85,
        supportingAnalystIds: ['sec'], dissentingAnalystIds: ['fin'],
        conflictsResolved: [], openIssues: [],
      };
      const a1 = analysis('a1', 'sec', 'p1', 'recommend', 0.9, 'r1');
      const mos: MinorityOpinion[] = [{
        id: 'm1', problemId: 'p1', analystId: 'fin',
        position: 'reject', reasoning: 'cost', dissentReason: 'budget',
      }];
      const d = synthesize('p1', consensus, [a1], [], { minorityOpinions: mos });
      expect(d.rationale).toContain('1 minority opinion');
    });
    test('rejects invalid problemId', () => {
      expect(() => synthesize('', null, [], [])).toThrow(SynthesisError);
    });
    test('rejects non-array analyses', () => {
      expect(() => synthesize('p1', null, 'nope' as unknown as Analysis[], []))
        .toThrow(SynthesisError);
    });
    test('honours overridden decisionId and generatedAt', () => {
      const d = synthesize('p1', null, [], [], {
        decisionId: 'custom', generatedAt: '2020-01-01T00:00:00.000Z',
      });
      expect(d.id).toBe('custom');
      expect(d.generatedAt).toBe('2020-01-01T00:00:00.000Z');
    });
    test('DEFAULT_SYNTHESIS_THRESHOLD is 0.6 and STRONG_CONSENSUS_RATIO is 0.8', () => {
      expect(DEFAULT_SYNTHESIS_THRESHOLD).toBe(0.6);
      expect(STRONG_CONSENSUS_RATIO).toBe(0.8);
    });
  });
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

describe('errors', () => {
  test('all errors extend CouncilError and carry stable codes', () => {
    const cases: Array<{ cls: typeof CouncilError; code: string }> = [
      { cls: CouncilError, code: 'COUNCIL_ERROR' },
      { cls: RoutingError, code: 'ROUTING_ERROR' },
      { cls: AnalysisError, code: 'ANALYSIS_ERROR' },
      { cls: ScoringError, code: 'SCORING_ERROR' },
      { cls: ConflictError, code: 'CONFLICT_ERROR' },
      { cls: DebateError, code: 'DEBATE_ERROR' },
      { cls: ConsensusError, code: 'CONSENSUS_ERROR' },
      { cls: SynthesisError, code: 'SYNTHESIS_ERROR' },
    ];
    for (const { cls, code } of cases) {
      const e = new cls('msg');
      expect(e).toBeInstanceOf(CouncilError);
      expect(e.code).toBe(code);
      expect(e.message).toBe('msg');
      expect(e.name).toBe(cls.name);
    }
  });
  test('errors preserve cause', () => {
    const inner = new Error('inner');
    const e = new RoutingError('outer', inner);
    expect(e.cause).toBe(inner);
  });
  test('CouncilError default code', () => {
    const e = new CouncilError('m');
    expect(e.code).toBe('COUNCIL_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

describe('logging', () => {
  test('SCRUBBED_FIELD_NAMES includes taxId/secret/token/apiKey/password', () => {
    expect(Array.isArray(SCRUBBED_FIELD_NAMES)).toBe(true);
    const names = SCRUBBED_FIELD_NAMES as readonly string[];
    for (const n of ['taxId', 'secret', 'token', 'apiKey', 'password']) {
      expect(names).toContain(n);
    }
  });
  test('shouldScrubField matches exact and suffix', () => {
    expect(shouldScrubField('password')).toBe(true);
    expect(shouldScrubField('user_password')).toBe(true);
    expect(shouldScrubField('passwordHint')).toBe(false);
    expect(shouldScrubField('description')).toBe(false);
  });
  test('scrubMetadata recurses into objects and arrays', () => {
    const out = scrubMetadata({
      name: 'alice', password: 'p', nested: { token: 't' }, arr: [{ apiKey: 'k' }],
    }) as Record<string, unknown>;
    expect(out.name).toBe('alice');
    expect(out.password).toBe('[redacted]');
    expect((out.nested as Record<string, unknown>).token).toBe('[redacted]');
    expect(((out.arr as Array<Record<string, unknown>>)[0]).apiKey).toBe('[redacted]');
  });
});

// ---------------------------------------------------------------------------
// End-to-end
// ---------------------------------------------------------------------------

describe('end-to-end: full council pipeline', () => {
  test('route → analyse → detect conflicts → debate → consensus → synthesise', () => {
    // 1. Pose a problem.
    const p: Problem = {
      id: 'p-e2e',
      description: 'Should we adopt the new crypto security audit proposal?',
      domain: 'security',
      createdAt: NOW,
    };

    // 2. Register specialists and route the problem.
    const registry = new SpecialistRegistry()
      .register(specialist('sec', ['security', 'crypto'], 2))
      .register(specialist('fin', ['finance', 'budget'], 1))
      .register(specialist('legal', ['legal', 'compliance'], 1))
      .register(specialist('ops', ['operations'], 1));
    const ranked = registry.route(p);
    expect(ranked.map((s) => s.id)).toContain('sec');
    expect(ranked[0].id).toBe('sec');

    // 3. Collect independent analyses.
    const collector = new AnalysisCollector();
    collector.submit(analysis('a-sec', 'sec', p.id,
      'I recommend we adopt the proposal; the security is sound.', 0.9,
      'Audit passed; risks are mitigated.'));
    collector.submit(analysis('a-fin', 'fin', p.id,
      'I support the proposal; the budget is sufficient.', 0.8,
      'Funds are allocated for this quarter.'));
    collector.submit(analysis('a-legal', 'legal', p.id,
      'I reject the proposal; compliance is incomplete.', 0.85,
      'Regulatory review is pending.'));

    const analyses = collector.getAll(p.id);
    expect(analyses).toHaveLength(3);

    // 4. Detect conflicts.
    const detector = new ConflictDetector();
    const conflicts = detector.detect(analyses);
    expect(conflicts.length).toBeGreaterThan(0);
    // At least one opposing_conclusion (sec+fin recommend vs legal rejects).
    expect(conflicts.some((c) => c.type === 'opposing_conclusion')).toBe(true);

    // 5. Open a debate over the conflicts.
    const facilitator = new DebateFacilitator();
    const debate = facilitator.open(p.id, conflicts.map((c) => c.id));
    facilitator.submitRound(debate.id, {
      id: 'r1', analystId: 'legal',
      claim: 'Compliance review is incomplete.',
      evidence: 'The regulatory checklist has open items.',
    });
    facilitator.submitRound(debate.id, {
      id: 'r2', analystId: 'sec',
      claim: 'Open items are advisory, not blocking.',
      evidence: 'No mandatory controls are missing.',
      rebuttalTo: 'r1',
    });
    facilitator.conclude(debate.id);
    expect(facilitator.get(debate.id)!.status).toBe('concluded');
    expect(facilitator.get(debate.id)!.rounds).toHaveLength(2);

    // 6. Record a minority opinion from legal.
    const tracker = new MinorityOpinionTracker();
    tracker.record({
      id: 'mo-legal', problemId: p.id, analystId: 'legal',
      position: 'Reject the proposal.',
      reasoning: 'Compliance review remains incomplete.',
      dissentReason: 'The consensus underestimates regulatory risk.',
    });

    // 7. Build consensus (sec + fin outweigh legal; legal is dissenting).
    const builder = new ConsensusBuilder(0.6);
    const consensus = builder.build(p.id, analyses, conflicts, {
      weights: { sec: 5, fin: 1, legal: 1 },
      minorityAnalystIds: ['legal'],
    });
    expect(consensus).not.toBeNull();
    expect(consensus!.decision).toContain('Adopt');
    expect(consensus!.supportingAnalystIds).toContain('sec');
    expect(consensus!.dissentingAnalystIds).toContain('legal');

    // 8. Synthesize a final decision.
    const decision = synthesize(p.id, consensus, analyses, conflicts, {
      minorityOpinions: tracker.getForProblem(p.id),
      decisionId: 'decision-e2e',
      generatedAt: NOW,
    });
    expect(decision.id).toBe('decision-e2e');
    expect(decision.problemId).toBe(p.id);
    // sec(weight 5) + fin(weight 1) dominate legal(weight 1) → ratio > 0.8 → strong
    expect(decision.consensusLevel).toBe('strong');
    expect(decision.confidence).toBeGreaterThan(0.6);
    expect(decision.participants).toEqual(expect.arrayContaining(['sec', 'fin', 'legal']));
    expect(decision.rationale).toContain('minority opinion');

    // 9. Build a review report.
    const report = buildReport({
      problemId: p.id,
      analyses,
      conflicts,
      debates: facilitator.list().filter((d) => d.problemId === p.id),
      minorityOpinions: tracker.getForProblem(p.id),
      consensus,
      recommendations: ['Proceed with adoption', 'Complete compliance review post-hoc'],
      reportId: 'report-e2e',
      generatedAt: NOW,
    });
    expect(report.id).toBe('report-e2e');
    expect(report.analyses).toHaveLength(3);
    expect(report.conflicts.length).toBeGreaterThan(0);
    expect(report.debates).toHaveLength(1);
    expect(report.minorityOpinions).toHaveLength(1);
    expect(report.consensus).toBe(consensus);
    expect(report.recommendations).toHaveLength(2);

    const serialized = serializeReport(report);
    const parsed = JSON.parse(serialized);
    expect(parsed.id).toBe('report-e2e');

    const summary = summarizeReport(report);
    expect(summary).toContain('3 analyses');
    expect(summary).toContain('Adopt');
  });
});
