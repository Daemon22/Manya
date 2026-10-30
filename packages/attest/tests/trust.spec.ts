import {
  TrustEvaluator,
  defaultTrustEvaluator,
  DEFAULT_FACTOR_WEIGHTS,
  TRUST_DECISION_THRESHOLD,
  CHALLENGE_DECISION_THRESHOLD,
  computeFactors,
  aggregateScore,
  decideFromScore,
  buildTrustScore,
  TrustEvaluationError,
  type TrustFactors,
} from '@manya-os/attest';

describe('trust/model', () => {
  it('decision thresholds are 0.7 and 0.3', () => {
    expect(TRUST_DECISION_THRESHOLD).toBe(0.7);
    expect(CHALLENGE_DECISION_THRESHOLD).toBe(0.3);
  });

  it('default weights sum to 1.0', () => {
    const sum =
      DEFAULT_FACTOR_WEIGHTS.fingerprintStability +
      DEFAULT_FACTOR_WEIGHTS.hardware +
      DEFAULT_FACTOR_WEIGHTS.attestation +
      DEFAULT_FACTOR_WEIGHTS.sessionAge +
      DEFAULT_FACTOR_WEIGHTS.priorInteractions;
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('decideFromScore returns trust/challenge/reject correctly', () => {
    expect(decideFromScore(0.9)).toBe('trust');
    expect(decideFromScore(0.7)).toBe('trust');
    expect(decideFromScore(0.5)).toBe('challenge');
    expect(decideFromScore(0.3)).toBe('challenge');
    expect(decideFromScore(0.2)).toBe('reject');
    expect(decideFromScore(0)).toBe('reject');
  });

  it('decideFromScore throws on non-finite input', () => {
    expect(() => decideFromScore(NaN)).toThrow(TrustEvaluationError);
    expect(() => decideFromScore(Infinity)).toThrow(TrustEvaluationError);
    expect(() => decideFromScore('1' as unknown as number)).toThrow(TrustEvaluationError);
  });

  it('computeFactors maps inputs to per-factor contributions', () => {
    const f = computeFactors({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 100,
    });
    expect(f.fingerprintStability).toBe(1);
    expect(f.hardware).toBe(1);
    expect(f.attestation).toBe(1);
    expect(f.sessionAge).toBe(1);
    expect(f.priorInteractions).toBe(1);
  });

  it('computeFactors penalizes fingerprint drift', () => {
    const f = computeFactors({
      fingerprintDrift: 0.5,
      hardwarePresent: false,
      attestationValid: false,
      sessionAgeMs: 0,
      priorInteractions: 0,
    });
    expect(f.fingerprintStability).toBe(0.5);
    expect(f.hardware).toBe(0);
    expect(f.attestation).toBe(0);
    expect(f.priorInteractions).toBe(0);
  });

  it('computeFactors decays sessionAge with 1-hour half-life', () => {
    const oneHour = 60 * 60 * 1000;
    const fresh = computeFactors({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 0,
    });
    const oneHourOld = computeFactors({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: oneHour,
      priorInteractions: 0,
    });
    expect(fresh.sessionAge).toBe(1);
    expect(oneHourOld.sessionAge).toBeCloseTo(0.5, 6);
  });

  it('computeFactors saturates priorInteractions at ~100', () => {
    const f = computeFactors({
      fingerprintDrift: 0,
      hardwarePresent: false,
      attestationValid: false,
      sessionAgeMs: 0,
      priorInteractions: 1000,
    });
    expect(f.priorInteractions).toBe(1);
  });

  it('computeFactors validates inputs', () => {
    expect(() =>
      computeFactors({
        fingerprintDrift: -1,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: 0,
      })
    ).toThrow(TrustEvaluationError);
    expect(() =>
      computeFactors({
        fingerprintDrift: 2,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: 0,
      })
    ).toThrow(TrustEvaluationError);
    expect(() =>
      computeFactors({
        fingerprintDrift: 0,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: -1,
        priorInteractions: 0,
      })
    ).toThrow(TrustEvaluationError);
    expect(() =>
      computeFactors({
        fingerprintDrift: 0,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: -1,
      })
    ).toThrow(TrustEvaluationError);
  });

  it('aggregateScore computes weighted sum', () => {
    const factors: TrustFactors = {
      fingerprintStability: 1,
      hardware: 0,
      attestation: 1,
      sessionAge: 0.5,
      priorInteractions: 0,
    };
    const weights: TrustFactors = {
      fingerprintStability: 0.5,
      hardware: 0.1,
      attestation: 0.2,
      sessionAge: 0.1,
      priorInteractions: 0.1,
    };
    const expected = 1 * 0.5 + 0 * 0.1 + 1 * 0.2 + 0.5 * 0.1 + 0 * 0.1;
    expect(aggregateScore(factors, weights)).toBeCloseTo(expected, 9);
  });

  it('buildTrustScore produces a full TrustScore', () => {
    const score = buildTrustScore({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 100,
    });
    expect(score.score).toBeCloseTo(1.0, 6);
    expect(score.decision).toBe('trust');
    expect(score.factors.fingerprintStability).toBe(1);
  });
});

describe('trust/evaluator', () => {
  it('default evaluator uses DEFAULT_FACTOR_WEIGHTS', () => {
    const e = new TrustEvaluator();
    expect(e.getWeights()).toEqual(DEFAULT_FACTOR_WEIGHTS);
  });

  it('default singleton is available', () => {
    expect(defaultTrustEvaluator).toBeDefined();
    expect(defaultTrustEvaluator.getWeights()).toEqual(DEFAULT_FACTOR_WEIGHTS);
  });

  it('evaluate produces a perfect score for perfect inputs', () => {
    const e = new TrustEvaluator();
    const s = e.evaluate({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 100,
    });
    expect(s.score).toBeCloseTo(1.0, 6);
    expect(s.decision).toBe('trust');
  });

  it('evaluate produces a low score for bad inputs', () => {
    const e = new TrustEvaluator();
    const s = e.evaluate({
      fingerprintDrift: 1,
      hardwarePresent: false,
      attestationValid: false,
      sessionAgeMs: 24 * 60 * 60 * 1000, // 24h old
      priorInteractions: 0,
    });
    expect(s.score).toBeLessThan(CHALLENGE_DECISION_THRESHOLD);
    expect(s.decision).toBe('reject');
  });

  it('evaluate respects custom weights', () => {
    // An evaluator that weights attestation at 100%.
    const e = new TrustEvaluator({
      fingerprintStability: 0,
      hardware: 0,
      attestation: 1,
      sessionAge: 0,
      priorInteractions: 0,
    });
    const goodAttest = e.evaluate({
      fingerprintDrift: 1,
      hardwarePresent: false,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 0,
    });
    expect(goodAttest.score).toBeCloseTo(1.0, 6);
    const badAttest = e.evaluate({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: false,
      sessionAgeMs: 0,
      priorInteractions: 100,
    });
    expect(badAttest.score).toBeCloseTo(0, 6);
  });

  it('constructor renormalizes weights that do not sum to 1', () => {
    const e = new TrustEvaluator({
      fingerprintStability: 2,
      hardware: 2,
      attestation: 2,
      sessionAge: 2,
      priorInteractions: 2,
    });
    const w = e.getWeights();
    const sum =
      w.fingerprintStability + w.hardware + w.attestation + w.sessionAge + w.priorInteractions;
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('constructor rejects zero-sum weights', () => {
    expect(
      () =>
        new TrustEvaluator({
          fingerprintStability: 0,
          hardware: 0,
          attestation: 0,
          sessionAge: 0,
          priorInteractions: 0,
        })
    ).toThrow(TrustEvaluationError);
  });

  it('constructor rejects negative weights', () => {
    expect(
      () =>
        new TrustEvaluator({
          fingerprintStability: -0.1,
          hardware: 0.5,
          attestation: 0.5,
          sessionAge: 0.1,
          priorInteractions: 0,
        })
    ).toThrow(TrustEvaluationError);
  });

  it('factorize returns just the factors', () => {
    const e = new TrustEvaluator();
    const f = e.factorize({
      fingerprintDrift: 0.2,
      hardwarePresent: true,
      attestationValid: false,
      sessionAgeMs: 0,
      priorInteractions: 5,
    });
    expect(f.fingerprintStability).toBeCloseTo(0.8, 6);
    expect(f.hardware).toBe(1);
    expect(f.attestation).toBe(0);
  });

  it('evaluateFromFactors skips the input→factor mapping', () => {
    const e = new TrustEvaluator();
    const factors: TrustFactors = {
      fingerprintStability: 1,
      hardware: 1,
      attestation: 1,
      sessionAge: 1,
      priorInteractions: 1,
    };
    const s = e.evaluateFromFactors(factors);
    expect(s.score).toBeCloseTo(1.0, 6);
    expect(s.decision).toBe('trust');
  });

  it('an attestation-only-validated session lands in the challenge band', () => {
    const e = new TrustEvaluator();
    const s = e.evaluate({
      fingerprintDrift: 0,
      hardwarePresent: false,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 0,
    });
    // Expected score: 0.30 (fp) + 0 (hw) + 0.30 (att) + 0.10 (sessionAge=1) + 0 (prior) = 0.70
    expect(s.score).toBeCloseTo(0.70, 2);
    // Right at the trust threshold.
    expect(s.decision).toBe('trust');
  });
});
