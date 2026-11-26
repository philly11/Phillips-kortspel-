import { type PlayerId, PLAYER_COUNT } from './game';
import { type Result, ok, err } from './result';
import type { RuleConfig } from './rules';

/*
 * The betting round, played once after the deal and before any card is played.
 *
 * - Everyone first puts in the ante (a forced bet), so the pot is never empty.
 * - Then, in turn order, each player CHECKS (when they've matched the highest bet),
 *   CALLS (puts in enough to match it) or RAISES (puts in more, any amount).
 * - No folding: everyone stays in. Someone who can't afford a call puts in
 *   everything they have ("all-in"). There is ONE pot and no side pots.
 * - The round ends when everyone who still has chips has acted since the last raise.
 */

export type BetAction =
  | { readonly type: 'check' }
  | { readonly type: 'call' }
  /** Raise BY `amount` chips on top of the current highest bet. */
  | { readonly type: 'raise'; readonly amount: number };

export interface BettingRound {
  /** Chips still in front of each player (not yet in the pot). */
  readonly stacks: readonly number[];
  /** Chips each player has put in this round, ante included. The pot is their sum. */
  readonly bets: readonly number[];
  /** True for players who still have to act before the round can end. */
  readonly needsToAct: readonly boolean[];
  /** Whose turn it is to bet, or null when the round is over. */
  readonly toAct: PlayerId | null;
}

export interface BetError {
  readonly code:
    | 'BETTING_OVER' // the round has already ended
    | 'MUST_CALL' // can't check: someone has bet more than you
    | 'NOTHING_TO_CALL' // can't call: you've already matched the highest bet
    | 'BAD_AMOUNT' // raise amount isn't a whole number of at least 1
    | 'NOT_ENOUGH_CHIPS'; // you can't pay for that raise
}

/**
 * Start the betting round: everyone pays the ante (or all they have, if less),
 * and `first` (the player who will lead the game) acts first.
 */
export function startBetting(stacks: readonly number[], rules: RuleConfig, first: PlayerId): BettingRound {
  const bets = stacks.map((stack) => Math.min(stack, rules.ante));
  const left = stacks.map((stack, seat) => stack - bets[seat]);
  const needsToAct = left.map((stack) => stack > 0);
  return {
    stacks: left,
    bets,
    needsToAct,
    toAct: nextToAct(needsToAct, first),
  };
}

/** The current player (`round.toAct`) checks, calls or raises. */
export function applyBet(round: BettingRound, action: BetAction): Result<BettingRound, BetError> {
  const me = round.toAct;
  if (me === null) {
    return err({ code: 'BETTING_OVER' });
  }
  const highest = highestBet(round);
  const owed = highest - round.bets[me];

  let pay: number;
  let raised = false;
  switch (action.type) {
    case 'check':
      if (owed > 0) return err({ code: 'MUST_CALL' });
      pay = 0;
      break;
    case 'call':
      if (owed === 0) return err({ code: 'NOTHING_TO_CALL' });
      // Can't afford the whole call? Then you're all-in with what you have.
      pay = Math.min(owed, round.stacks[me]);
      break;
    case 'raise':
      if (!Number.isInteger(action.amount) || action.amount < 1) return err({ code: 'BAD_AMOUNT' });
      pay = owed + action.amount;
      if (pay > round.stacks[me]) return err({ code: 'NOT_ENOUGH_CHIPS' });
      raised = true;
      break;
  }

  const stacks = round.stacks.map((stack, seat) => (seat === me ? stack - pay : stack));
  const bets = round.bets.map((bet, seat) => (seat === me ? bet + pay : bet));
  const needsToAct = round.needsToAct.map((needs, seat) => {
    if (seat === me) return false;
    // A raise means everyone else (who still has chips) must answer it.
    return raised ? stacks[seat] > 0 : needs;
  });
  return ok({ stacks, bets, needsToAct, toAct: nextToAct(needsToAct, (me + 1) % PLAYER_COUNT) });
}

/** The biggest bet anyone has made this round. */
export function highestBet(round: BettingRound): number {
  return Math.max(...round.bets);
}

/** All the chips in the pot. */
export function potOf(round: BettingRound): number {
  return round.bets.reduce((sum, bet) => sum + bet, 0);
}

export function isBettingOver(round: BettingRound): boolean {
  return round.toAct === null;
}

/** Starting at `from` and going round the table, the first player who still has to act. */
function nextToAct(needsToAct: readonly boolean[], from: PlayerId): PlayerId | null {
  for (let step = 0; step < PLAYER_COUNT; step++) {
    const seat = (from + step) % PLAYER_COUNT;
    if (needsToAct[seat]) return seat;
  }
  return null;
}