import {
  MerkleTree,
  verifyProof,
  sha256,
  MerkleError,
} from '@manya-os/ledger';

const LEAF_PREFIX = Buffer.from([0x00]);

function leafHash(raw: Buffer): Buffer {
  return sha256(Buffer.concat([LEAF_PREFIX, raw]));
}

describe('MerkleTree', () => {
  describe('build', () => {
    it('rejects empty leaves', () => {
      expect(() => MerkleTree.build([])).toThrow(MerkleError);
    });

    it('rejects non-Buffer leaves', () => {
      expect(() => MerkleTree.build(['not-buffer' as any])).toThrow(MerkleError);
    });

    it('builds a tree with a single leaf', () => {
      const leaf = Buffer.from('leaf1');
      const tree = MerkleTree.build([leaf]);
      expect(tree.leafCount).toBe(1);
      expect(tree.root()).toBeInstanceOf(Buffer);
      expect(tree.root().length).toBe(32);
    });

    it('builds a tree with two leaves', () => {
      const tree = MerkleTree.build([Buffer.from('a'), Buffer.from('b')]);
      expect(tree.leafCount).toBe(2);
    });

    it('builds a tree with many leaves', () => {
      const leaves = Array.from({ length: 10 }, (_, i) => Buffer.from(`leaf-${i}`));
      const tree = MerkleTree.build(leaves);
      expect(tree.leafCount).toBe(10);
    });
  });

  describe('root', () => {
    it('is deterministic', () => {
      const leaves = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
      const t1 = MerkleTree.build(leaves);
      const t2 = MerkleTree.build(leaves);
      expect(t1.root().equals(t2.root())).toBe(true);
    });

    it('changes when leaves change', () => {
      const t1 = MerkleTree.build([Buffer.from('a'), Buffer.from('b')]);
      const t2 = MerkleTree.build([Buffer.from('a'), Buffer.from('c')]);
      expect(t1.root().equals(t2.root())).toBe(false);
    });

    it('handles odd leaf count by duplicating last', () => {
      const leaves = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
      const tree = MerkleTree.build(leaves);
      expect(tree.leafCount).toBe(3);
      expect(tree.root().length).toBe(32);
    });

    it('produces different roots for different orderings', () => {
      const t1 = MerkleTree.build([Buffer.from('a'), Buffer.from('b')]);
      const t2 = MerkleTree.build([Buffer.from('b'), Buffer.from('a')]);
      expect(t1.root().equals(t2.root())).toBe(false);
    });
  });

  describe('getProof', () => {
    it('produces a valid proof for each leaf', () => {
      const leaves = Array.from({ length: 8 }, (_, i) => Buffer.from(`leaf-${i}`));
      const tree = MerkleTree.build(leaves);
      for (let i = 0; i < leaves.length; i++) {
        const proof = tree.getProof(i);
        expect(proof.index).toBe(i);
        expect(proof.siblings.length).toBeGreaterThan(0);
        expect(tree.verifyProof(leafHash(leaves[i]), proof)).toBe(true);
      }
    });

    it('rejects out-of-range index', () => {
      const tree = MerkleTree.build([Buffer.from('a')]);
      expect(() => tree.getProof(1)).toThrow(MerkleError);
      expect(() => tree.getProof(-1)).toThrow(MerkleError);
    });

    it('works for single leaf', () => {
      const leaf = Buffer.from('only');
      const tree = MerkleTree.build([leaf]);
      const proof = tree.getProof(0);
      expect(proof.siblings.length).toBe(0);
      expect(tree.verifyProof(leafHash(leaf), proof)).toBe(true);
    });

    it('handles odd leaf count', () => {
      const leaves = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
      const tree = MerkleTree.build(leaves);
      for (let i = 0; i < 3; i++) {
        const proof = tree.getProof(i);
        expect(tree.verifyProof(leafHash(leaves[i]), proof)).toBe(true);
      }
    });
  });

  describe('verifyProof', () => {
    it('returns false for wrong leaf', () => {
      const leaves = [Buffer.from('a'), Buffer.from('b')];
      const tree = MerkleTree.build(leaves);
      const proof = tree.getProof(0);
      expect(verifyProof(leafHash(Buffer.from('wrong')), proof, tree.root())).toBe(false);
    });

    it('returns false for wrong root', () => {
      const leaves = [Buffer.from('a'), Buffer.from('b')];
      const tree = MerkleTree.build(leaves);
      const proof = tree.getProof(0);
      const fakeRoot = sha256(Buffer.from('fake'));
      expect(verifyProof(leafHash(leaves[0]), proof, fakeRoot)).toBe(false);
    });

    it('rejects non-Buffer leaf/root', () => {
      expect(() => verifyProof('not-buf' as any, { index: 0, siblings: [] }, Buffer.alloc(32))).toThrow(MerkleError);
    });

    it('rejects malformed proof', () => {
      expect(() => verifyProof(Buffer.from('x'), null as any, Buffer.alloc(32))).toThrow(MerkleError);
    });
  });
});
