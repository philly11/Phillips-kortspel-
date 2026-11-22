import { describe, it, expect } from 'vitest';
import { makeDeck, sortCards } from './card';
import { THREE_OF_SPADES, createGame, dealHands, findHolder } from './game';
import { err } from './result';
import { card, cards } from './test-utils';

/** Create a game in a test, failing loudly if it's an error. */
function newGame(options: { seed: number; previousWinner?: number }) {
  const result = createGame(options);
  if (!result.ok) {
    throw new Error(`createGame failed: ${result.error.code}`);
  }
  return result.value;
}

describe('dealHands', () => {
  it('gives 4 players 13 cards each', () => {
    const hands = dealHands(42);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
  });

  it('deals every card in the deck exactly once', () => {
    expect(sortCards(dealHands(42).flat())).toEqual(makeDeck());
  });

  it('sorts each hand weakest → strongest', () => {
    for (const hand of dealHands(42)) {
      expect(hand).toEqual(sortCards(hand));
    }
  });

  it('the same seed gives the same deal; a different seed gives a different one', () => {
    expect(dealHands(42)).toEqual(dealHands(42));
    expect(dealHands(42)).not.toEqual(dealHands(43));
  });

  it('matches the known deal for seed 42', () => {
    // Golden value: seat 2 gets this exact hand with seed 42.
    expect(dealHands(42)[2]).toEqual(cards('3♠ 3♣ 4♥ 5♥ 6♥ 7♣ 7♦ 8♣ 9♦ 10♦ J♣ Q♣ A♦'));
  });
});

describe('findHolder', () => {
  it('finds which seat holds a card', () => {
    const hands = [cards('4♠ 5♠'), cards('6♠'), cards('3♠ 9♥'), cards('2♥')];
    expect(findHolder(hands, card('3♠'))).toBe(2);
    expect(findHolder(hands, card('2♥'))).toBe(3);
  });
});

describe('createGame: first game', () => {
  it('the holder of 3♠ leads, and must include 3♠', () => {
    for (const seed of [1, 2, 3, 42, 2026]) {
      const state = newGame({ seed });
      expect(state.hands[state.currentPlayer]).toContain(THREE_OF_SPADES);
      expect(state.requiredCard).toBe(THREE_OF_SPADES);
    }
  });

  it('starts with an empty table, nobody passed, nobody finished', () => {
    const state = newGame({ seed: 42 });
    expect(state.table).toBe(null);
    expect(state.lastPlayedBy).toBe(null);
    expect(state.passed).toEqual([false, false, false, false]);
    expect(state.finished).toEqual([]);
  });

  it('remembers the seed', () => {
    expect(newGame({ seed: 42 }).seed).toBe(42);
  });
});

describe('createGame: later games', () => {
  it('the previous winner leads, with no required card', () => {
    const state = newGame({ seed: 42, previousWinner: 1 });
    expect(state.currentPlayer).toBe(1);
    expect(state.requiredCard).toBe(null);
  });

  it('rejects a previous winner who is not a seat 0–3', () => {
    expect(createGame({ seed: 42, previousWinner: 4 })).toEqual(err({ code: 'INVALID_PLAYER' }));
    expect(createGame({ seed: 42, previousWinner: -1 })).toEqual(err({ code: 'INVALID_PLAYER' }));
    expect(createGame({ seed: 42, previousWinner: 1.5 })).toEqual(err({ code: 'INVALID_PLAYER' }));
  });
});