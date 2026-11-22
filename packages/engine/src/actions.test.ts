import { describe, it, expect } from 'vitest';
import { isGameOver, playCards } from './actions';
import type { GameState } from './game';
import { err } from './result';
import { cards, combo, makeState } from './test-utils';

/** Play in a test, failing loudly if the engine refuses. */
function play(state: GameState, text: string): GameState {
  const result = playCards(state, cards(text));
  if (!result.ok) {
    throw new Error(`play "${text}" refused: ${result.error.code}`);
  }
  return result.value;
}

describe('playCards: leading a new trick', () => {
  const start = makeState({ hands: ['3♠ 4♦ 7♣ 7♥', '5♠', '6♠', '8♠'] });

  it('removes the cards from the hand and puts the combo on the table', () => {
    const after = play(start, '7♣ 7♥');
    expect(after.hands[0]).toEqual(cards('3♠ 4♦'));
    expect(after.table).toEqual(combo('7♣ 7♥'));
    expect(after.lastPlayedBy).toBe(0);
  });

  it('passes the turn to the next seat, wrapping from 3 back to 0', () => {
    expect(play(start, '3♠').currentPlayer).toBe(1);
    const seat3 = makeState({ hands: ['5♠', '6♠', '8♠', '3♠ 9♦'], currentPlayer: 3 });
    expect(play(seat3, '9♦').currentPlayer).toBe(0);
  });

  it('does not change the original state', () => {
    play(start, '7♣ 7♥');
    expect(start.hands[0]).toEqual(cards('3♠ 4♦ 7♣ 7♥'));
    expect(start.table).toBe(null);
  });
});

describe('playCards: illegal plays', () => {
  const start = makeState({ hands: ['3♠ 4♦ 7♣ 7♥', '5♠', '6♠', '8♠'] });

  it('refuses cards that are not a combo', () => {
    expect(playCards(start, cards('3♠ 7♥'))).toEqual(err({ code: 'NOT_A_COMBO' }));
    expect(playCards(start, [])).toEqual(err({ code: 'EMPTY' }));
  });

  it('refuses cards the player does not hold', () => {
    expect(playCards(start, cards('5♠'))).toEqual(err({ code: 'CARDS_NOT_IN_HAND' }));
    expect(playCards(start, cards('7♣ 7♦'))).toEqual(err({ code: 'CARDS_NOT_IN_HAND' }));
  });
});

describe('playCards: the first play must include 3♠', () => {
  const first = makeState({ hands: ['3♠ 4♠ 5♠ 9♦', '6♠', '7♠', '8♠'], requiredCard: '3♠' });

  it('refuses a first play without 3♠', () => {
    expect(playCards(first, cards('9♦'))).toEqual(err({ code: 'MISSING_REQUIRED_CARD' }));
  });

  it('allows any combo that includes 3♠, and then the requirement is gone', () => {
    expect(play(first, '3♠').requiredCard).toBe(null);
    expect(play(first, '3♠ 4♠ 5♠').table).toEqual(combo('3♠ 4♠ 5♠'));
  });
});

describe('playCards: beating the table', () => {
  const onTable = (hand: string, table: string) =>
    makeState({ hands: ['5♠', hand, '6♠', '8♠'], currentPlayer: 1, table, lastPlayedBy: 0 });

  it('allows a play that beats the table', () => {
    expect(play(onTable('9♥ K♦', '9♠'), '9♥').table).toEqual(combo('9♥'));
  });

  it('refuses a play that is too low or the wrong type', () => {
    expect(playCards(onTable('9♥ K♦', 'A♠'), cards('K♦'))).toEqual(err({ code: 'TOO_LOW' }));
    expect(playCards(onTable('9♥ 9♦', 'A♠'), cards('9♥ 9♦'))).toEqual(err({ code: 'WRONG_TYPE' }));
  });

  it('allows a chop', () => {
    const state = onTable('3♠ 3♣ 4♠ 4♣ 5♠ 5♣ 9♦', '2♥');
    expect(play(state, '3♠ 3♣ 4♠ 4♣ 5♠ 5♣').table).toEqual(combo('3♠ 3♣ 4♠ 4♣ 5♠ 5♣'));
  });
});

describe('playCards: turn order skips players who are out', () => {
  it('skips players who have passed this trick', () => {
    const state = makeState({ hands: ['3♠ 9♦', '5♠', '6♠', '8♠'], passed: [false, true, false, false] });
    expect(play(state, '3♠').currentPlayer).toBe(2);
  });

  it('skips players who have finished', () => {
    const state = makeState({ hands: ['3♠ 9♦', '', '6♠', '8♠'], finished: [1] });
    expect(play(state, '3♠').currentPlayer).toBe(2);
  });
});

describe('playCards: finishing', () => {
  it('playing your last cards puts you in the finished list', () => {
    const state = makeState({ hands: ['9♦', '5♠', '6♠', '8♠'] });
    const after = play(state, '9♦');
    expect(after.hands[0]).toEqual([]);
    expect(after.finished).toEqual([0]);
  });

  it('the game is over when only one player has cards left', () => {
    const state = makeState({ hands: ['', '', '6♠', '8♠'], finished: [0, 1], currentPlayer: 2 });
    const after = play(state, '6♠');
    expect(after.finished).toEqual([0, 1, 2]);
    expect(isGameOver(after)).toBe(true);
  });

  it('refuses any play once the game is over', () => {
    const over = makeState({ hands: ['', '', '', '8♠'], finished: [0, 1, 2], currentPlayer: 3 });
    expect(playCards(over, cards('8♠'))).toEqual(err({ code: 'GAME_OVER' }));
  });
});