import { LinkGraph } from '@manya-os/memory';

describe('LinkGraph', () => {
  describe('add and traverse', () => {
    test('add and traverse', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'causes');
      g.add('b', 'c', 'causes');
      g.add('c', 'd', 'causes');
      expect(g.traverse('a', 'causes')).toEqual(['b', 'c', 'd']);
    });

    test('traverse with maxDepth', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'causes');
      g.add('b', 'c', 'causes');
      g.add('c', 'd', 'causes');
      expect(g.traverse('a', 'causes', 1)).toEqual(['b']);
    });

    test('traverse returns empty for unknown start', () => {
      const g = new LinkGraph();
      expect(g.traverse('unknown', 'causes')).toHaveLength(0);
    });

    test('traverse follows only specified relation', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'causes');
      g.add('a', 'c', 'relates_to');
      expect(g.traverse('a', 'causes')).toEqual(['b']);
    });
  });

  describe('outgoingFrom and incomingTo', () => {
    test('outgoingFrom returns outgoing links', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'rel');
      g.add('a', 'c', 'rel');
      expect(g.outgoingFrom('a')).toHaveLength(2);
    });

    test('incomingTo returns incoming links', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'rel');
      g.add('c', 'b', 'rel');
      expect(g.incomingTo('b')).toHaveLength(2);
    });

    test('outgoingFrom returns empty for unknown node', () => {
      const g = new LinkGraph();
      expect(g.outgoingFrom('unknown')).toHaveLength(0);
    });
  });

  describe('byRelation', () => {
    test('byRelation filters by relation type', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'causes');
      g.add('c', 'd', 'relates_to');
      expect(g.byRelation('causes')).toHaveLength(1);
    });
  });

  describe('remove', () => {
    test('remove', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'rel');
      expect(g.remove('a', 'b', 'rel')).toBe(true);
      expect(g.size()).toBe(0);
    });

    test('remove returns false for non-existent link', () => {
      const g = new LinkGraph();
      expect(g.remove('a', 'b', 'rel')).toBe(false);
    });
  });

  describe('all and size', () => {
    test('all returns all links', () => {
      const g = new LinkGraph();
      g.add('a', 'b', 'rel1');
      g.add('c', 'd', 'rel2');
      expect(g.all()).toHaveLength(2);
    });

    test('size tracks link count', () => {
      const g = new LinkGraph();
      expect(g.size()).toBe(0);
      g.add('a', 'b', 'rel');
      expect(g.size()).toBe(1);
    });
  });
});
