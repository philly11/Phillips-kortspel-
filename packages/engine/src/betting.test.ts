import { describe, expect, it } from 'vitest';
import { type BetAction, type BettingRound, applyBet, highestBet, isBettingOver, potOf, startBetting } from './betting';
import { DEFAULT_RULES, type RuleConfig } from './rules';

const rules: RuleConfig = { ...DEFAULT_RULES, ante: 5 };

/** Apply a list of bets in order. Throws if one is refused: a test setup mistake. */
function bets(round: BettingRound, actions: readonly BetAction[]): BettingRound {
  return actions.reduce((current, action) => {
    const result = applyBet(current, action);
    if (!result.ok) throw new Error(`Bet refused in test setup: ${result.error.code}`);
    return result.value;
  }, round);
}

const check: BetAction = { type: 'check' };
const call: BetAction = { type: 'call' };
const raise = (amount: number): BetAction => ({ type: 'raise', amount });

describe('startBetting', () => {
  it('takes the ante from everyone', () => {
    const round = startBetting([100, 100, 100, 100], rules, 0);
    expect(round.stacks).toEqual([95, 95, 95, 95]);
    expect(round.bets).toEqual([5, 5, 5, 5]);
    expect(potOf(round)).toBe(20);
  });

  it('lets the given player act first', () => {
    expect(startBetting([100, 100, 100, 100], rules, 2).toAct).toBe(2);
  });

  it('puts a player who cannot afford the ante all-in', () => {
    const round = startBetting([3, 100, 100, 100], rules, 1);
    expect(round.stacks[0]).toBe(0);
    expect(round.bets[0]).toBe(3);
    expect(round.needsToAct[0]).toBe(false);
  });

  it('skips a first player with no chips left', () => {
    expect(startBetting([0, 100, 100, 100], rules, 0).toAct).toBe(1);
  });

  it('reads the ante from the rules', () => {
    const round = startBetting([100, 100, 100, 100], { ...rules, ante: 0 }, 0);
    expect(potOf(round)).toBe(0);
  });
});

describe('applyBet: check', () => {
  it('ends the round when everyone checks', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [check, check, check, check]);
    expect(isBettingOver(round)).toBe(true);
    expect(potOf(round)).toBe(20);
  });

  it('moves the turn round the table from the first player', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 3), [check]);
    expect(round.toAct).toBe(0);
  });

  it('is refused when someone has bet more', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(10)]);
    expect(applyBet(round, check)).toEqual({ ok: false, error: { code: 'MUST_CALL' } });
  });
});

describe('applyBet: call', () => {
  it('matches the highest bet', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(10), call]);
    expect(round.bets[1]).toBe(15);
    expect(round.stacks[1]).toBe(85);
  });

  it('is refused when there is nothing to call', () => {
    const round = startBetting([100, 100, 100, 100], rules, 0);
    expect(applyBet(round, call)).toEqual({ ok: false, error: { code: 'NOTHING_TO_CALL' } });
  });

  it('goes all-in when the player cannot afford the whole call', () => {
    const round = bets(startBetting([100, 20, 100, 100], rules, 0), [raise(30), call]);
    expect(round.stacks[1]).toBe(0);
    expect(round.bets[1]).toBe(20);
  });
});

describe('applyBet: raise', () => {
  it('accepts any whole amount the player can pay', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(37)]);
    expect(round.bets[0]).toBe(42);
    expect(highestBet(round)).toBe(42);
  });

  it('makes everyone else act again', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [check, check, raise(10)]);
    expect(round.needsToAct).toEqual([true, true, false, true]);
    expect(round.toAct).toBe(3);
  });

  it('ends the round once everyone has answered the raise', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [check, raise(10), call, call, call]);
    expect(isBettingOver(round)).toBe(true);
    expect(potOf(round)).toBe(60);
  });

  it('can be raised again (re-raise)', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(10), raise(20)]);
    expect(round.bets).toEqual([15, 35, 5, 5]);
    expect(round.needsToAct).toEqual([true, false, true, true]);
  });

  it('can put the player all-in', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(95)]);
    expect(round.stacks[0]).toBe(0);
  });

  it('does not ask an all-in player to act again', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [raise(95), call, call, call]);
    expect(isBettingOver(round)).toBe(true);
    expect(round.stacks).toEqual([0, 0, 0, 0]);
  });

  it('is refused for more chips than the player has', () => {
    const round = startBetting([100, 100, 100, 100], rules, 0);
    expect(applyBet(round, raise(96))).toEqual({ ok: false, error: { code: 'NOT_ENOUGH_CHIPS' } });
  });

  it('is refused for zero, negative or fractional amounts', () => {
    const round = startBetting([100, 100, 100, 100], rules, 0);
    for (const amount of [0, -5, 2.5, Number.NaN]) {
      expect(applyBet(round, raise(amount))).toEqual({ ok: false, error: { code: 'BAD_AMOUNT' } });
    }
  });
});

describe('the round as a whole', () => {
  it('refuses bets after it is over', () => {
    const round = bets(startBetting([100, 100, 100, 100], rules, 0), [check, check, check, check]);
    expect(applyBet(round, check)).toEqual({ ok: false, error: { code: 'BETTING_OVER' } });
  });

  it('is over at once when nobody has chips to bet', () => {
    expect(isBettingOver(startBetting([5, 5, 0, 2], rules, 0))).toBe(true);
  });

  it('keeps one pot even when a short stack is all-in', () => {
    const round = bets(startBetting([100, 20, 100, 100], rules, 0), [raise(45), call, call, call]);
    expect(round.bets).toEqual([50, 20, 50, 50]);
    expect(potOf(round)).toBe(170);
  });

  it('never creates or loses chips', () => {
    const start = [100, 37, 64, 12];
    const round = bets(startBetting(start, rules, 1), [raise(7), call, call, raise(30), call, call]);
    const total = round.stacks.reduce((a, b) => a + b, 0) + potOf(round);
    expect(total).toBe(start.reduce((a, b) => a + b, 0));
  });
});