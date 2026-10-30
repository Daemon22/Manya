import {
  exportAuditLog,
  importJsonl,
  createEvent,
  GENESIS_PREV_HASH,
  ExportError,
  LedgerEvent,
} from '@manya-os/ledger';

function makeEvents(count: number): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  let prev = GENESIS_PREV_HASH;
  for (let i = 1; i <= count; i++) {
    const ev = createEvent({
      type: i % 2 === 0 ? 'user.created' : 'config.updated',
      actor: i % 3 === 0 ? 'alice' : 'bob',
      payload: { value: i, name: `item-${i}` },
      seq: i,
      prevHash: prev,
    });
    prev = ev.hash;
    events.push(ev);
  }
  return events;
}

describe('exportAuditLog', () => {
  const events = makeEvents(3);

  describe('json format', () => {
    it('exports events as JSON array', () => {
      const output = exportAuditLog(events, 'json');
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
    });

    it('includes all event fields', () => {
      const output = exportAuditLog(events, 'json');
      const parsed = JSON.parse(output);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('seq');
      expect(parsed[0]).toHaveProperty('type');
      expect(parsed[0]).toHaveProperty('hash');
    });

    it('excludes signature fields when includeSignatureFields is false', () => {
      const output = exportAuditLog(events, 'json', { includeSignatureFields: false });
      const parsed = JSON.parse(output);
      expect(parsed[0]).not.toHaveProperty('signature');
    });
  });

  describe('jsonl format', () => {
    it('exports one JSON object per line', () => {
      const output = exportAuditLog(events, 'jsonl');
      const lines = output.trim().split('\n');
      expect(lines.length).toBe(3);
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it('handles empty events', () => {
      const output = exportAuditLog([], 'jsonl');
      expect(output).toBe('');
    });
  });

  describe('csv format', () => {
    it('exports events as CSV', () => {
      const output = exportAuditLog(events, 'csv');
      const lines = output.trim().split('\n');
      expect(lines.length).toBe(4);
      expect(lines[0]).toContain('seq');
      expect(lines[0]).toContain('type');
    });

    it('includes payload columns', () => {
      const output = exportAuditLog(events, 'csv');
      expect(output).toContain('value');
      expect(output).toContain('name');
    });
  });

  describe('filter', () => {
    it('filters events', () => {
      const output = exportAuditLog(events, 'json', {
        filter: (e) => e.actor === 'alice',
      });
      const parsed = JSON.parse(output);
      expect(parsed.length).toBe(1);
      parsed.forEach((e: any) => expect(e.actor).toBe('alice'));
    });
  });

  it('rejects non-array input', () => {
    expect(() => exportAuditLog(null as any, 'json')).toThrow(ExportError);
  });

  it('rejects unknown format', () => {
    expect(() => exportAuditLog(events, 'xml' as any)).toThrow(ExportError);
  });
});

describe('importJsonl', () => {
  it('imports valid JSONL', () => {
    const events = makeEvents(3);
    const jsonl = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const imported = importJsonl(jsonl);
    expect(imported.length).toBe(3);
    expect(imported[0].seq).toBe(1);
  });

  it('skips blank lines', () => {
    const events = makeEvents(2);
    const jsonl = '\n' + JSON.stringify(events[0]) + '\n\n' + JSON.stringify(events[1]) + '\n\n';
    const imported = importJsonl(jsonl);
    expect(imported.length).toBe(2);
  });

  it('handles empty input', () => {
    expect(importJsonl('')).toEqual([]);
    expect(importJsonl('\n\n')).toEqual([]);
  });

  it('throws on malformed JSON', () => {
    expect(() => importJsonl('not-json\n')).toThrow(ExportError);
  });

  it('throws on non-string input', () => {
    expect(() => importJsonl(null as any)).toThrow(ExportError);
  });
});

describe('export-import round trip', () => {
  it('JSON round trip preserves events', () => {
    const events = makeEvents(5);
    const exported = exportAuditLog(events, 'json');
    const parsed = JSON.parse(exported);
    expect(parsed.length).toBe(5);
    expect(parsed[0].id).toBe(events[0].id);
    expect(parsed[4].hash).toBe(events[4].hash);
  });

  it('JSONL round trip preserves events', () => {
    const events = makeEvents(5);
    const exported = exportAuditLog(events, 'jsonl');
    const imported = importJsonl(exported);
    expect(imported.length).toBe(5);
    expect(imported[0].id).toBe(events[0].id);
  });
});
