import { describe, it, expect } from 'vitest';
import { playCards } from './actions';
import { createGame } from './game';
import { err } from './result';
import { hideCards, revealCards } from './reveal';
import { cards, makeState } from './test-utils';
import { view } from './view';

// Seat 0 has played 9♠; it's seat 1's turn.
const state = makeState({
  hands: ['3♠ 9♦', '4♠ 2♣ 2♥', '5♠ A♦', '6♠ K♦'],
  table: '9♠',
  lastPlayedBy: 0,
  currentPlayer: 1,
});

describe('revealCards', () => {
  it('shows the chosen cards to the table', () => {
    const result = revealCards(state, 1, cards('2♣ 2♥'));
    expect(result.ok && result.value.revealed).toEqual([[], cards('2♣ 2♥'), [], []]);
  });

  it('works when it is not your turn, and changes nothing else', () => {
    const result = revealCards(state, 3, cards('K♦'));
    expect(result.ok && result.value.currentPlayer).toBe(1);
    expect(result.ok && result.value.table).toEqual(state.table);
    expect(result.ok && result.value.hands).toEqual(state.hands);
  });

  it('adds to earlier reveals, sorted, without duplicates', () => {
    const first = revealCards(state, 1, cards('2♥'));
    const second = first.ok ? revealCards(first.value, 1, cards('2♥ 2♣')) : first;
    expect(second.ok && second.value.revealed[1]).toEqual(cards('2♣ 2♥'));
  });

  it('refuses cards the player does not hold', () => {
    expect(revealCards(state, 1, cards('A♦'))).toEqual(err({ code: 'CARDS_NOT_IN_HAND' }));
  });

  it('refuses an empty reveal and a seat that does not exist', () => {
    expect(revealCards(state, 1, [])).toEqual(err({ code: 'EMPTY' }));
    expect(revealCards(state, 4, cards('4♠'))).toEqual(err({ code: 'INVALID_PLAYER' }));
  });
});

describe('hideCards', () => {
  it("turns that player's revealed cards face-down, and only theirs", () => {
    const shown = makeState({ hands: ['3♠', '2♣ 2♥', '5♠', 'K♦'], revealed: ['3♠', '2♣ 2♥', '', ''] });
    const result = hideCards(shown, 1);
    expect(result.ok && result.value.revealed).toEqual([cards('3♠'), [], [], []]);
  });

  it('refuses a seat that does not exist', () => {
    expect(hideCards(state, -1)).toEqual(err({ code: 'INVALID_PLAYER' }));
  });
});

describe('revealed cards and the rest of the game', () => {
  it('nothing is revealed at the start of a game', () => {
    const game = createGame({ seed: 42 });
    expect(game.ok && game.value.revealed).toEqual([[], [], [], []]);
  });

  it('a revealed card stops being revealed once it is played', () => {
    const shown = makeState({
      hands: ['3♠', '4♠ 2♣ 2♥', '5♠', '6♠'],
      table: '9♠',
      lastPlayedBy: 0,
      currentPlayer: 1,
      revealed: ['', '2♣ 2♥', '', ''],
    });
    const result = playCards(shown, cards('2♥'));
    expect(result.ok && result.value.revealed[1]).toEqual(cards('2♣'));
  });

  it("everyone's view shows the revealed cards, but still not the hidden ones", () => {
    const shown = revealCards(state, 1, cards('2♣ 2♥'));
    const seen = shown.ok ? view(shown.value, 0) : shown;
    expect(seen.ok && seen.value.revealed[1]).toEqual(cards('2♣ 2♥'));
    expect(seen.ok && seen.value.cardCounts[1]).toBe(3); // 4♠ stays secret
    expect(seen.ok && 'hands' in seen.value).toBe(false);
  });
});