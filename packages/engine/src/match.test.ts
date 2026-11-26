import { describe, expect, it } from 'vitest';
import type { Action } from './actions';
import type { GameState } from './game';
import {
  type MatchState,
  applyMatchAction,
  applyMatchBet,
  matchView,
  nextMatchGame,
  startMatch,
  withGame,
} from './match';
import type { Result } from './result';
import { DEFAULT_RULES, type RuleConfig } from './rules';
import { cards, makeState } from './test-utils';

const rules: RuleConfig = { startingChips: 100, ante: 5, trickBonus: 2, chopPayment: 10 };

/** Unwrap a Result in a test, failing loudly if the engine refused. */
function mustOk<T>(result: Result<T, { code: string }>): T {
  if (!result.ok) throw new Error(`engine refused: ${result.error.code}`);
  return result.value;
}

/** A match already in the 'playing' phase, around a hand-made game. */
function playing(game: GameState, stacks: number[], pot: number, matchRules: RuleConfig = rules): MatchState {
  const match = mustOk(startMatch(matchRules, 1));
  return { ...match, phase: 'playing', stacks, pot, game, payments: [] };
}

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);
const play = (text: string): Action => ({ type: 'play', cards: cards(text) });
const pass: Action = { type: 'pass' };

// Seat 0 played 2♥; seat 1 can chop it with four 6s.
const onTwo = makeState({
  hands: ['3♠', '4♠ 6♠ 6♣ 6♦ 6♥ 2♠', '5♠', '7♠'],
  table: '2♥',
  lastPlayedBy: 0,
  currentPlayer: 1,
});

// Seat 0 played 9♠; seats 1 and 2 passed; seat 3 decides.
const lastToPass = makeState({
  hands: ['3♠ 4♠', '5♠ 6♠', '7♠ 8♠', '10♠ J♠'],
  table: '9♠',
  lastPlayedBy: 0,
  passed: [false, true, true, false],
  currentPlayer: 3,
});

// Seats 0 and 1 are out (0 first); seat 2 leads and plays their last card.
const lastCard = makeState({
  hands: ['', '', '5♠', '9♠ 10♠'],
  finished: [0, 1],
  currentPlayer: 2,
});

describe('startMatch', () => {
  it('gives everyone the starting chips and takes the ante', () => {
    const match = mustOk(startMatch(rules, 42));
    expect(match.phase).toBe('betting');
    expect(match.stacks).toEqual([95, 95, 95, 95]);
    expect(match.pot).toBe(20);
  });

  it('reads the starting chips from the rules', () => {
    const match = mustOk(startMatch({ ...rules, startingChips: 50 }, 42));
    expect(match.stacks).toEqual([45, 45, 45, 45]);
  });

  it('lets the player who leads the game bet first', () => {
    const match = mustOk(startMatch(rules, 42));
    expect(match.betting.toAct).toBe(match.game.currentPlayer);
  });

  it('skips betting when nobody has chips', () => {
    const match = mustOk(startMatch({ ...rules, startingChips: 0 }, 42));
    expect(match.phase).toBe('playing');
  });
});

describe('applyMatchBet', () => {
  it('starts the game once betting is over', () => {
    let match = mustOk(startMatch(rules, 42));
    match = mustOk(applyMatchBet(match, { type: 'raise', amount: 10 }));
    for (let i = 0; i < 3; i++) match = mustOk(applyMatchBet(match, { type: 'call' }));
    expect(match.phase).toBe('playing');
    expect(match.stacks).toEqual([85, 85, 85, 85]);
    expect(match.pot).toBe(60);
  });

  it('passes on the betting error', () => {
    const match = mustOk(applyMatchBet(mustOk(startMatch(rules, 42)), { type: 'raise', amount: 10 }));
    expect(applyMatchBet(match, { type: 'check' })).toEqual({ ok: false, error: { code: 'MUST_CALL' } });
  });

  it('is refused once the cards are being played', () => {
    const match = playing(onTwo, [50, 50, 50, 50], 20);
    expect(applyMatchBet(match, { type: 'check' })).toEqual({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('applyMatchAction: phases and errors', () => {
  it('is refused during betting', () => {
    const match = mustOk(startMatch(rules, 42));
    expect(applyMatchAction(match, pass)).toEqual({ ok: false, error: { code: 'WRONG_PHASE' } });
  });

  it('passes on the game error', () => {
    const match = playing(onTwo, [50, 50, 50, 50], 20);
    expect(applyMatchAction(match, play('A♥'))).toEqual({ ok: false, error: { code: 'CARDS_NOT_IN_HAND' } });
  });
});

describe('applyMatchAction: chop payment', () => {
  it('makes the chopped player pay the chopper', () => {
    const after = mustOk(applyMatchAction(playing(onTwo, [50, 50, 50, 50], 20), play('6♠ 6♣ 6♦ 6♥')));
    expect(after.stacks).toEqual([40, 60, 50, 50]);
    expect(after.pot).toBe(20);
    expect(after.payments).toEqual([{ reason: 'chop', from: 0, to: 1, amount: 10 }]);
  });

  it('reads the amount from the rules', () => {
    const after = mustOk(
      applyMatchAction(playing(onTwo, [50, 50, 50, 50], 20, { ...rules, chopPayment: 25 }), play('6♠ 6♣ 6♦ 6♥')),
    );
    expect(after.stacks).toEqual([25, 75, 50, 50]);
  });

  it('takes only what the chopped player has', () => {
    const after = mustOk(applyMatchAction(playing(onTwo, [3, 50, 50, 50], 20), play('6♠ 6♣ 6♦ 6♥')));
    expect(after.stacks).toEqual([0, 53, 50, 50]);
  });

  it('moves no chips for a normal beat', () => {
    const onNine = makeState({ hands: ['3♠', '4♠ 2♠', '5♠', '7♠'], table: '9♠', lastPlayedBy: 0, currentPlayer: 1 });
    const after = mustOk(applyMatchAction(playing(onNine, [50, 50, 50, 50], 20), play('2♠')));
    expect(after.stacks).toEqual([50, 50, 50, 50]);
    expect(after.payments).toEqual([]);
  });
});

describe('applyMatchAction: trick bonus', () => {
  it('pays the trick winner from the pot when everyone else passed', () => {
    const after = mustOk(applyMatchAction(playing(lastToPass, [50, 50, 50, 50], 20), pass));
    expect(after.stacks).toEqual([52, 50, 50, 50]);
    expect(after.pot).toBe(18);
    expect(after.payments).toEqual([{ reason: 'trick', from: 'pot', to: 0, amount: 2 }]);
  });

  it('reads the bonus from the rules', () => {
    const after = mustOk(applyMatchAction(playing(lastToPass, [50, 50, 50, 50], 20, { ...rules, trickBonus: 7 }), pass));
    expect(after.pot).toBe(13);
  });

  it('pays only what is left in the pot', () => {
    const after = mustOk(applyMatchAction(playing(lastToPass, [50, 50, 50, 50], 1), pass));
    expect(after.stacks[0]).toBe(51);
    expect(after.pot).toBe(0);
  });

  it('pays nothing from an empty pot', () => {
    const after = mustOk(applyMatchAction(playing(lastToPass, [50, 50, 50, 50], 0), pass));
    expect(after.payments).toEqual([]);
  });

  it('pays nothing while the trick goes on', () => {
    const notLast = { ...lastToPass, passed: [false, true, false, false], currentPlayer: 2 };
    const after = mustOk(applyMatchAction(playing(notLast, [50, 50, 50, 50], 20), pass));
    expect(after.pot).toBe(20);
  });
});

describe('applyMatchAction: game over', () => {
  it('gives the winner what is left in the pot', () => {
    const after = mustOk(applyMatchAction(playing(lastCard, [50, 50, 50, 50], 30), play('5♠')));
    expect(after.phase).toBe('over');
    expect(after.stacks).toEqual([80, 50, 50, 50]);
    expect(after.pot).toBe(0);
    expect(after.payments).toEqual([{ reason: 'win', from: 'pot', to: 0, amount: 30 }]);
  });

  it('refuses plays after the game is over', () => {
    const after = mustOk(applyMatchAction(playing(lastCard, [50, 50, 50, 50], 30), play('5♠')));
    expect(applyMatchAction(after, pass)).toEqual({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('a whole game', () => {
  it('ends with all chips accounted for', () => {
    let match = mustOk(startMatch(rules, 7));
    // Bets: the first player raises 20, everyone calls.
    match = mustOk(applyMatchBet(match, { type: 'raise', amount: 20 }));
    while (match.phase === 'betting') match = mustOk(applyMatchBet(match, { type: 'call' }));

    // Very simple players: play the lowest single that's allowed, otherwise pass.
    let moves = 0;
    while (match.phase === 'playing') {
      const hand = match.game.hands[match.game.currentPlayer];
      let next: MatchState | null = null;
      for (const card of hand) {
        const result = applyMatchAction(match, { type: 'play', cards: [card] });
        if (result.ok) {
          next = result.value;
          break;
        }
      }
      match = next ?? mustOk(applyMatchAction(match, pass));
      expect(sum(match.stacks) + match.pot).toBe(400); // the invariant, after every move
      moves++;
      if (moves > 500) throw new Error('game never ended');
    }
    expect(match.phase).toBe('over');
    expect(match.pot).toBe(0);
  });
});

describe('nextMatchGame', () => {
  const over = mustOk(applyMatchAction(playing(lastCard, [80, 50, 50, 50], 0), play('5♠')));

  it('carries the chips over and takes a new ante', () => {
    const next = mustOk(nextMatchGame(over, 9));
    expect(next.phase).toBe('betting');
    expect(next.stacks).toEqual([75, 45, 45, 45]);
    expect(next.pot).toBe(20);
  });

  it('lets the previous winner lead (and bet first)', () => {
    const next = mustOk(nextMatchGame(over, 9));
    expect(next.game.currentPlayer).toBe(0);
    expect(next.betting.toAct).toBe(0);
  });

  it('is refused while a game is running', () => {
    expect(nextMatchGame(mustOk(startMatch(rules, 1)), 9)).toEqual({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('matchView and withGame', () => {
  it('shows chips to everyone but only your own hand', () => {
    const match = mustOk(startMatch(DEFAULT_RULES, 42));
    const seen = mustOk(matchView(match, 2));
    expect(seen.stacks).toEqual(match.stacks);
    expect(seen.pot).toBe(match.pot);
    expect(seen.game.hand).toEqual(match.game.hands[2]);
    expect('hands' in seen.game).toBe(false);
    expect('seed' in seen.game).toBe(false);
  });

  it('refuses a player who is not at the table', () => {
    expect(matchView(mustOk(startMatch(rules, 42)), 4)).toEqual({ ok: false, error: { code: 'INVALID_PLAYER' } });
  });

  it('withGame swaps the cards without touching the chips', () => {
    const match = mustOk(applyMatchAction(playing(onTwo, [50, 50, 50, 50], 20), play('6♠ 6♣ 6♦ 6♥')));
    const swapped = withGame(match, lastCard);
    expect(swapped.game).toBe(lastCard);
    expect(swapped.stacks).toEqual(match.stacks);
    expect(swapped.payments).toEqual([]);
  });
});