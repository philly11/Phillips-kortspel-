import type { Card } from './card';
import { type BeatError, checkBeat } from './beat';
import { type ComboError, detectCombo } from './combo';
import { type GameState, type PlayerId, PLAYER_COUNT } from './game';
import { type Result, ok, err } from './result';
import { forgetPlayedCards } from './reveal';

/** Something a player can do on their turn. */
export type Action =
  | { readonly type: 'play'; readonly cards: readonly Card[] }
  | { readonly type: 'pass' };

/** Why an action was refused. Includes every combo and beat error, so callers see the real reason. */
export interface ActionError {
  readonly code:
    | ComboError['code']
    | BeatError['code']
    | 'GAME_OVER'
    | 'CARDS_NOT_IN_HAND'
    | 'MISSING_REQUIRED_CARD'
    | 'CANNOT_PASS_ON_LEAD';
}

/**
 * THE entry point of the engine: the current player does `action`.
 * Returns the NEW state, or the reason the action is not allowed.
 */
export function applyAction(state: GameState, action: Action): Result<GameState, ActionError> {
  switch (action.type) {
    case 'play':
      return playCards(state, action.cards);
    case 'pass':
      return passTurn(state);
  }
}

/** The current player plays `cards`. */
export function playCards(state: GameState, cards: readonly Card[]): Result<GameState, ActionError> {
  if (isGameOver(state)) {
    return err({ code: 'GAME_OVER' });
  }

  const player = state.currentPlayer;
  const hand = state.hands[player];
  

  // 1. Is it a combo at all?
  const combo = detectCombo(cards);
  if (!combo.ok) {
    return err(combo.error);
  }

  // 2. Does the player actually hold these cards?
  if (!cards.every((card) => hand.includes(card))) {
    return err({ code: 'CARDS_NOT_IN_HAND' });
  }

  // 3. First play of the first game must include 3♠.
  if (state.requiredCard !== null && !cards.includes(state.requiredCard)) {
    return err({ code: 'MISSING_REQUIRED_CARD' });
  }

  // 4. If there's something on the table, the play must beat it.
  if (state.table !== null) {
    const beat = checkBeat(state.table, combo.value);
    if (!beat.ok) {
      return err(beat.error);
    }
  }

  // All checks passed: build the next snapshot.
  const newHand = hand.filter((card) => !cards.includes(card));
  const hands = state.hands.map((h, seat) => (seat === player ? newHand : h));
  const finished = newHand.length === 0 ? [...state.finished, player] : state.finished;

  const next: GameState = {
    ...state,
    hands,
    finished,
    table: combo.value,
    lastPlayedBy: player,
    requiredCard: null,
    revealed: forgetPlayedCards(state.revealed, player, cards),
  };
  return ok(advanceTurn(next, player));
}

/**
 * The current player passes: they are out until this trick ends.
 * You can't pass when leading a new trick (there's nothing to pass on).
 */
export function passTurn(state: GameState): Result<GameState, ActionError> {
  if (isGameOver(state)) {
    return err({ code: 'GAME_OVER' });
  }
  if (state.table === null) {
    return err({ code: 'CANNOT_PASS_ON_LEAD' });
  }

  const player = state.currentPlayer;
  const next: GameState = {
    ...state,
    passed: state.passed.map((hasPassed, seat) => hasPassed || seat === player),
  };
  return ok(advanceTurn(next, player));
}

/** The game ends when only one player still has cards. */
export function isGameOver(state: GameState): boolean {
  return state.finished.length >= PLAYER_COUNT - 1;
}

/**
 * The next seat after `from` (going round the table) that is still in this trick:
 * not passed and not finished. If nobody else is, returns `from`.
 */
export function nextPlayer(state: GameState, from: PlayerId): PlayerId {
  for (let step = 1; step < PLAYER_COUNT; step++) {
    const seat = (from + step) % PLAYER_COUNT;
    if (!state.passed[seat] && !state.finished.includes(seat)) {
      return seat;
    }
  }
  return from;
}

/**
 * After a play or a pass by `actor`: either the trick is over and a new one
 * starts, or the turn simply moves on to the next player still in the trick.
 */
function advanceTurn(state: GameState, actor: PlayerId): GameState {
  if (isGameOver(state)) {
    return state;
  }
  if (isTrickOver(state)) {
    return startNewTrick(state);
  }
  return { ...state, currentPlayer: nextPlayer(state, actor) };
}

/**
 * A trick is over when every player still in the game, except the one whose
 * combo is on the table, has passed. Nobody is left to beat it.
 */
function isTrickOver(state: GameState): boolean {
  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    const stillPlaying = !state.finished.includes(seat);
    if (stillPlaying && seat !== state.lastPlayedBy && !state.passed[seat]) {
      return false;
    }
  }
  return true;
}

/**
 * Clear the table and let everyone back in. The player who played last leads.
 * If they have gone out, the next player after them (still in the game) leads.
 */
function startNewTrick(state: GameState): GameState {
  const fresh: GameState = {
    ...state,
    table: null,
    lastPlayedBy: null,
    passed: state.passed.map(() => false),
  };
  const winner = state.lastPlayedBy ?? state.currentPlayer;
  const leader = state.finished.includes(winner) ? nextPlayer(fresh, winner) : winner;
  return { ...fresh, currentPlayer: leader };
}