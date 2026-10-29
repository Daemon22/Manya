import { DEFAULT_CONFIG, mergeConfig } from '@manya-os/memory';

describe('DEFAULT_CONFIG', () => {
  test('has expected aging defaults', () => {
    expect(DEFAULT_CONFIG.aging?.workingTtlMs).toBe(5 * 60_000);
    expect(DEFAULT_CONFIG.aging?.episodicMaxCount).toBe(10_000);
    expect(DEFAULT_CONFIG.aging?.episodicPruneThreshold).toBe(0.3);
    expect(DEFAULT_CONFIG.aging?.longtermCompressAfterDays).toBe(90);
  });

  test('has expected ranking weights', () => {
    expect(DEFAULT_CONFIG.rankingWeights).toEqual({
      tfidf: 0.4,
      importance: 0.3,
      recency: 0.2,
      access: 0.1,
    });
  });

  test('defaults logLevel to info', () => {
    expect(DEFAULT_CONFIG.logLevel).toBe('info');
  });
});

describe('mergeConfig', () => {
  test('returns defaults when no user config', () => {
    const result = mergeConfig();
    expect(result.aging?.workingTtlMs).toBe(5 * 60_000);
    expect(result.logLevel).toBe('info');
  });

  test('merges partial user config', () => {
    const result = mergeConfig({ logLevel: 'silent' });
    expect(result.logLevel).toBe('silent');
    expect(result.aging?.workingTtlMs).toBe(5 * 60_000);
  });

  test('merges partial aging overrides', () => {
    const result = mergeConfig({ aging: { episodicMaxCount: 500 } });
    expect(result.aging?.episodicMaxCount).toBe(500);
    expect(result.aging?.workingTtlMs).toBe(5 * 60_000);
  });

  test('merges partial ranking weight overrides', () => {
    const result = mergeConfig({ rankingWeights: { tfidf: 0.5, importance: 0.3, recency: 0.1, access: 0.1 } });
    expect(result.rankingWeights?.tfidf).toBe(0.5);
  });

  test('user logger is preserved', () => {
    const customLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const result = mergeConfig({ logger: customLogger });
    expect(result.logger).toBe(customLogger);
  });
});
