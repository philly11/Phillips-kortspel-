import type { Card } from './card';

/**
 * A random number generator: each call returns the next number in [0, 1),
 * just like Math.random() — but the sequence is fully decided by a seed.
 */
export type Rng = () => number;

/**
 * Create a seeded RNG using the well-known "mulberry32" algorithm.
 * Same seed → same sequence, on every computer, every time.
 *
 * The engine must never use Math.random(); all randomness comes from here.
 */
export function createRng(seed: number): Rng {
  // The RNG's whole memory is this one number. `>>> 0` turns any number
  // into a whole, non-negative 32-bit integer.
  let state = seed >>> 0;

  return () => {
    // A fixed recipe that scrambles the bits of `state`. You don't need to
    // follow every line: it's a published algorithm, and the tests check it.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // divide by 2^32 → [0, 1)
  };
}

/**
 * Return a NEW array with the cards in random order (Fisher–Yates shuffle).
 * The input is not changed. Every order is equally likely.
 */
export function shuffle(cards: readonly Card[], rng: Rng): Card[] {
  const result = [...cards];
  // Walk from the last position to the second; swap each with a random
  // position at or before it.
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); // a whole number from 0 to i
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}