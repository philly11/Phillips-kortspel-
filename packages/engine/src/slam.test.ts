import { describe, it, expect } from 'vitest';
import { applyAction, passTurn, playCards } from './actions';
import { type GameState, createGame } from './game';
import { type Result, err } from './result';
import { cards, makeState } from './test-utils';
import { view } from './view';

/** Unwrap a Result in a test, failing loudly if the engine refused. */
function mustOk(result: Result<GameState, { code: string }>): GameState {
  if (!result.ok) {
    throw new Error(`engine refused: ${result.error.code}`);
  }
  return result.value;
}

// Seat 0 has played 2♥; it's seat 1's turn.
const onTwo = makeState({
  hands: ['3♠', '4♠ 6♠ 6♣ 6♦ 6♥ 2♠ A♦', '5♠', '7♠'],
  table: '2♥',
  lastPlayedBy: 0,
  currentPlayer: 1,
});

// Seat 0 has played 9♠; it's seat 1's turn.
const onNine = makeState({
  hands: ['3♠', '4♠ 2♠', '5♠', '7♠'],
  table: '9♠',
  lastPlayedBy: 0,
  currentPlayer: 1,
});

describe('slamming a play', () => {
  it('a normal play is not a slam', () => {
    const after = mustOk(applyAction(onTwo, { type: 'play', cards: cards('6♠ 6♣ 6♦ 6♥') }));
    expect(after.lastPlay?.slammed).toBe(false);
  });

  it('a play with slam: true is remembered as a slam', () => {
    const after = mustOk(applyAction(onTwo, { type: 'play', cards: cards('6♠ 6♣ 6♦ 6♥'), slam: true }));
    expect(after.lastPlay?.slammed).toBe(true);
  });

  it('a slam follows exactly the same rules: an illegal slam is still refused', () => {
    const tooLow = applyAction(onTwo, { type: 'play', cards: cards('A♦'), slam: true });
    expect(tooLow).toEqual(err({ code: 'TOO_LOW' }));
  });

  it('slamming does not change anything else about the result', () => {
    const normal = playCards(onTwo, cards('6♠ 6♣ 6♦ 6♥'));
    const slammed = playCards(onTwo, cards('6♠ 6♣ 6♦ 6♥'), true);
    if (!normal.ok || !slammed.ok) throw new Error('both plays should be legal');
    expect({ ...slammed.value, lastPlay: null }).toEqual({ ...normal.value, lastPlay: null });
  });
});

describe('remembering a chop', () => {
  it('four of a kind on a 2 is remembered as a chop', () => {
    const after = mustOk(playCards(onTwo, cards('6♠ 6♣ 6♦ 6♥')));
    expect(after.lastPlay).toEqual({ slammed: false, chopped: true });
  });

  it('a normal beat is not a chop', () => {
    const after = mustOk(playCards(onNine, cards('2♠')));
    expect(after.lastPlay).toEqual({ slammed: false, chopped: false });
  });

  it('leading a new trick is never a chop', () => {
    const leading = makeState({ hands: ['3♠ 3♣ 4♠ 4♣ 5♠ 5♣', '6♠', '7♠', '8♠'] });
    const after = mustOk(playCards(leading, cards('3♠ 3♣ 4♠ 4♣ 5♠ 5♣')));
    expect(after.lastPlay?.chopped).toBe(false);
  });
});

describe('lastPlay over the course of a game', () => {
  it('is empty at the start of a game', () => {
    const game = createGame({ seed: 42 });
    expect(game.ok && game.value.lastPlay).toBe(null);
  });

  it('stays while players pass, and clears when a new trick starts', () => {
    const slammed = mustOk(playCards(onNine, cards('2♠'), true)); // seat 1 slams 2♠ on 9♠
    const afterOnePass = mustOk(passTurn(slammed)); // seat 2 passes
    expect(afterOnePass.lastPlay).toEqual({ slammed: true, chopped: false });

    const afterTwo = mustOk(passTurn(afterOnePass)); // seat 3 passes
    const afterThree = mustOk(passTurn(afterTwo)); // seat 0 passes -> trick over
    expect(afterThree.table).toBe(null);
    expect(afterThree.lastPlay).toBe(null);
  });

  it("is part of every player's view, so everyone sees the slam", () => {
    const slammed = mustOk(playCards(onNine, cards('2♠'), true));
    const seen = view(slammed, 3);
    expect(seen.ok && seen.value.lastPlay).toEqual({ slammed: true, chopped: false });
  });
});