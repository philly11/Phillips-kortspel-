import { type Action, type ActionError, applyAction, isGameOver } from './actions';
import { checkBeat } from './beat';
import { type BetAction, type BetError, type BettingRound, applyBet, isBettingOver, potOf, startBetting } from './betting';
import { detectCombo } from './combo';
import { type GameError, type GameState, type PlayerId, PLAYER_COUNT, createGame, isValidPlayer } from './game';
import { type Result, ok, err } from './result';
import type { RuleConfig } from './rules';
import { type PlayerView, type ViewError, view } from './view';

/*
 * A MATCH is one game of Tiến Lên plus the chips around it:
 *
 *   'betting' → ante + one betting round (see betting.ts). No cards are played yet.
 *   'playing' → the normal game. Money moves while it's played:
 *                 - a chop: the chopped player pays the chopper (from their own stack)
 *                 - a won trick: the winner takes the trick bonus from the pot
 *   'over'    → the game has ended; the winner (1st place) took what was left in the pot.
 *
 * Chips are carried from game to game with nextMatchGame().
 */

export type MatchPhase = 'betting' | 'playing' | 'over';

/** One movement of chips, so the client can say e.g. "Bao paid Anna 10 for the chop". */
export interface Payment {
  readonly reason: 'chop' | 'trick' | 'win';
  /** A player, or 'pot' when the chips come out of the pot. */
  readonly from: PlayerId | 'pot';
  readonly to: PlayerId;
  readonly amount: number;
}

export interface MatchState {
  readonly rules: RuleConfig;
  readonly phase: MatchPhase;
  /** stacks[seat] = chips in front of that player (not in the pot). */
  readonly stacks: readonly number[];
  /** Chips in the pot. */
  readonly pot: number;
  /** The betting round while phase is 'betting' (also kept afterwards, to show who bet what). */
  readonly betting: BettingRound;
  /** The card game itself. */
  readonly game: GameState;
  /** The chips moved by the most recent action (often none). */
  readonly payments: readonly Payment[];
}

export interface MatchError {
  readonly code: 'WRONG_PHASE' | BetError['code'] | ActionError['code'] | GameError['code'];
}

/** The very first game in a room: everyone starts with rules.startingChips. */
export function startMatch(rules: RuleConfig, seed: number): Result<MatchState, MatchError> {
  const stacks = Array.from({ length: PLAYER_COUNT }, () => rules.startingChips);
  return dealMatch(rules, stacks, seed, undefined);
}

/** The next game, once this one is over. Chips carry over; the winner leads. */
export function nextMatchGame(match: MatchState, seed: number): Result<MatchState, MatchError> {
  if (match.phase !== 'over') {
    return err({ code: 'WRONG_PHASE' });
  }
  return dealMatch(match.rules, match.stacks, seed, match.game.finished[0]);
}

/** A bet in the betting round, by whoever's turn it is to bet. */
export function applyMatchBet(match: MatchState, action: BetAction): Result<MatchState, MatchError> {
  if (match.phase !== 'betting') {
    return err({ code: 'WRONG_PHASE' });
  }
  const result = applyBet(match.betting, action);
  if (!result.ok) {
    return err(result.error);
  }
  return ok(afterBet(match, result.value));
}

/** A play or a pass in the card game, with any chips it moves. */
export function applyMatchAction(match: MatchState, action: Action): Result<MatchState, MatchError> {
  if (match.phase !== 'playing') {
    return err({ code: 'WRONG_PHASE' });
  }
  const before = match.game;
  const result = applyAction(before, action);
  if (!result.ok) {
    return err(result.error);
  }
  const after = result.value;

  const stacks = [...match.stacks];
  let pot = match.pot;
  const payments: Payment[] = [];

  // 1. A chop: whoever's cards were chopped pays the chopper, right away.
  const chopped = action.type === 'play' && isChop(before, action);
  if (chopped && before.lastPlayedBy !== null) {
    const victim = before.lastPlayedBy;
    const chopper = before.currentPlayer;
    const amount = Math.min(match.rules.chopPayment, stacks[victim]);
    stacks[victim] -= amount;
    stacks[chopper] += amount;
    payments.push({ reason: 'chop', from: victim, to: chopper, amount });
  }

  // 2. A won trick: the table was cleared for a new trick (and the game goes on).
  const gameOver = isGameOver(after);
  if (!gameOver && after.table === null) {
    // The trick's winner is whoever's cards were on top when it ended.
    const winner = action.type === 'play' ? before.currentPlayer : before.lastPlayedBy;
    const amount = Math.min(match.rules.trickBonus, pot);
    if (winner !== null && amount > 0) {
      pot -= amount;
      stacks[winner] += amount;
      payments.push({ reason: 'trick', from: 'pot', to: winner, amount });
    }
  }

  // 3. Game over: the winner takes what's left in the pot.
  if (gameOver) {
    const winner = after.finished[0];
    if (pot > 0) {
      stacks[winner] += pot;
      payments.push({ reason: 'win', from: 'pot', to: winner, amount: pot });
      pot = 0;
    }
  }

  return ok({
    ...match,
    phase: gameOver ? 'over' : 'playing',
    stacks,
    pot,
    game: after,
    payments,
  });
}

/**
 * Replace the card game without moving chips: for the taunt (revealCards / hideCards),
 * which can happen in any phase.
 */
export function withGame(match: MatchState, game: GameState): MatchState {
  return { ...match, game, payments: [] };
}

// ── What one player may see ───────────────────────────────────────────────

/** Chips and bets are public; the cards go through the normal view(). */
export interface MatchView {
  readonly phase: MatchPhase;
  readonly rules: RuleConfig;
  readonly stacks: readonly number[];
  readonly pot: number;
  readonly betting: BettingRound;
  readonly payments: readonly Payment[];
  readonly game: PlayerView;
}

/** Build the view for `playerId`. Allowlist, like view(): every field copied by name. */
export function matchView(match: MatchState, playerId: PlayerId): Result<MatchView, ViewError> {
  if (!isValidPlayer(playerId)) {
    return err({ code: 'INVALID_PLAYER' });
  }
  const game = view(match.game, playerId);
  if (!game.ok) {
    return err(game.error);
  }
  return ok({
    phase: match.phase,
    rules: match.rules,
    stacks: match.stacks,
    pot: match.pot,
    betting: match.betting,
    payments: match.payments,
    game: game.value,
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** Deal a game and open the betting round (everyone pays the ante). */
function dealMatch(
  rules: RuleConfig,
  stacks: readonly number[],
  seed: number,
  previousWinner: PlayerId | undefined,
): Result<MatchState, MatchError> {
  const game = createGame({ seed, previousWinner });
  if (!game.ok) {
    return err(game.error);
  }
  // The player who will lead the game also opens the betting.
  const betting = startBetting(stacks, rules, game.value.currentPlayer);
  const match: MatchState = {
    rules,
    phase: 'betting',
    stacks,
    pot: 0,
    betting,
    game: game.value,
    payments: [],
  };
  return ok(afterBet(match, betting));
}

/** Copy the betting round's chips into the match, and start playing once betting is over. */
function afterBet(match: MatchState, betting: BettingRound): MatchState {
  return {
    ...match,
    phase: isBettingOver(betting) ? 'playing' : 'betting',
    stacks: betting.stacks,
    pot: potOf(betting),
    betting,
    payments: [],
  };
}

/** Did this (already accepted) play beat the table by chopping? */
function isChop(before: GameState, action: Extract<Action, { type: 'play' }>): boolean {
  if (before.table === null) return false;
  const combo = detectCombo(action.cards);
  if (!combo.ok) return false;
  const beat = checkBeat(before.table, combo.value);
  return beat.ok && beat.value === 'chop';
}