import { describe, it, expect } from 'vitest';
import { makeDeck, sortCards } from './card';
import { createRng, shuffle } from './rng';

/** Take the next `count` numbers from an RNG. */
function take(rng: () => number, count: number): number[] {
  return Array.from({ length: count }, () => rng());
}

describe('createRng', () => {
  it('the same seed gives the same sequence', () => {
    expect(take(createRng(42), 5)).toEqual(take(createRng(42), 5));
  });

  it('different seeds give different sequences', () => {
    expect(take(createRng(42), 5)).not.toEqual(take(createRng(43), 5));
  });

  it('matches the known mulberry32 output for seed 42', () => {
    // "Golden values": if anyone accidentally changes the algorithm,
    // every saved game and replay would change. This test catches that.
    expect(take(createRng(42), 3)).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
  });

  it('always returns numbers from 0 up to (but not including) 1', () => {
    for (const value of take(createRng(123), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads results evenly (each of 4 buckets gets roughly a quarter)', () => {
    const buckets = [0, 0, 0, 0];
    for (const value of take(createRng(1), 10_000)) {
      buckets[Math.floor(value * 4)]++;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(2_300); // a perfect split would be 2,500
      expect(count).toBeLessThan(2_700);
    }
  });
});

describe('shuffle', () => {
  it('keeps exactly the same cards, just reordered', () => {
    const deck = makeDeck();
    const shuffled = shuffle(deck, createRng(42));
    expect(shuffled).toHaveLength(52);
    expect(sortCards(shuffled)).toEqual(deck);
  });

  it('actually changes the order', () => {
    expect(shuffle(makeDeck(), createRng(42))).not.toEqual(makeDeck());
  });

  it('the same seed gives the same shuffle; a different seed gives a different one', () => {
    const a = shuffle(makeDeck(), createRng(7));
    const b = shuffle(makeDeck(), createRng(7));
    const c = shuffle(makeDeck(), createRng(8));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('does not change the original array', () => {
    const deck = makeDeck();
    shuffle(deck, createRng(42));
    expect(deck).toEqual(makeDeck());
  });

  it('handles an empty list', () => {
    expect(shuffle([], createRng(42))).toEqual([]);
  });
});