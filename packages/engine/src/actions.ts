import type { Card } from './card';
import { type BeatError, checkBeat } from './beat';
import { type ComboError, detectCombo } from './combo';
import { type GameState, type PlayerId, PLAYER_COUNT } from './game';
import { type Result, ok, err } from './result';

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
    | 'MISSING_REQUIRED_CARD';
}

/**
 * The current player plays `cards`. Returns a NEW state, or the reason it's not allowed.
 * (Passing, and what happens when a trick ends, come in the next step.)
 */
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
  };
  return ok({ ...next, currentPlayer: nextPlayer(next, player) });
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