import { describe, it, expect } from 'vitest';
import { err } from './result';
import { combo, cards, card, makeState } from './test-utils';
import { type PlayerView, view } from './view';

const state = makeState({
  hands: ['3♠ 4♠ 5♠', '6♦ 7♦', '8♥', '9♣ 10♣ J♣ Q♣'],
  table: '2♠',
  lastPlayedBy: 3,
  currentPlayer: 1,
  passed: [true, false, false, false],
  requiredCard: '3♠',
});

/** View in a test, failing loudly if refused. */
function viewOf(playerId: number): PlayerView {
  const result = view(state, playerId);
  if (!result.ok) {
    throw new Error(`view refused: ${result.error.code}`);
  }
  return result.value;
}

describe('view', () => {
  it('shows a player their own hand', () => {
    expect(viewOf(0).hand).toEqual(cards('3♠ 4♠ 5♠'));
    expect(viewOf(3).hand).toEqual(cards('9♣ 10♣ J♣ Q♣'));
  });

  it('shows only how many cards the others hold', () => {
    expect(viewOf(0).cardCounts).toEqual([3, 2, 1, 4]);
  });

  it('never includes the other hands or the seed', () => {
    const v = viewOf(0);
    expect('hands' in v).toBe(false);
    expect('seed' in v).toBe(false);
  });

  it('includes everything that is public', () => {
    const v = viewOf(2);
    expect(v.me).toBe(2);
    expect(v.currentPlayer).toBe(1);
    expect(v.table).toEqual(combo('2♠'));
    expect(v.lastPlayedBy).toBe(3);
    expect(v.passed).toEqual([true, false, false, false]);
    expect(v.finished).toEqual([]);
    expect(v.requiredCard).toBe(card('3♠'));
  });

  it('a player who has finished sees an empty hand', () => {
    const done = makeState({ hands: ['', '6♦', '8♥', '9♣'], finished: [0] });
    const result = view(done, 0);
    expect(result.ok && result.value.hand).toEqual([]);
  });

  it('refuses a seat that does not exist', () => {
    expect(view(state, 4)).toEqual(err({ code: 'INVALID_PLAYER' }));
    expect(view(state, -1)).toEqual(err({ code: 'INVALID_PLAYER' }));
  });
});