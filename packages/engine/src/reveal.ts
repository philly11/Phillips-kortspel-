import { type Card, sortCards } from './card';
import { type GameState, type Hand, type PlayerId, isValidPlayer } from './game';
import { type Result, ok, err } from './result';

/*
 * The "taunt" feature: a player shows cards from their hand to the whole table.
 *
 * - Any player, at any time, even when it's not their turn.
 * - It never changes whose turn it is or what's on the table.
 * - Revealed cards stay face-up until they're played or the player hides them.
 *
 * Not part of applyAction: that's for the current player's turn move (play/pass).
 * Revealing has no turn, so it takes the player explicitly.
 */

export interface RevealError {
  readonly code: 'INVALID_PLAYER' | 'EMPTY' | 'CARDS_NOT_IN_HAND';
}

/** `player` shows `cards` to everyone. Adds to anything they've already revealed. */
export function revealCards(
  state: GameState,
  player: PlayerId,
  cards: readonly Card[],
): Result<GameState, RevealError> {
  if (!isValidPlayer(player)) {
    return err({ code: 'INVALID_PLAYER' });
  }
  if (cards.length === 0) {
    return err({ code: 'EMPTY' });
  }
  const hand = state.hands[player];
  if (!cards.every((card) => hand.includes(card))) {
    return err({ code: 'CARDS_NOT_IN_HAND' });
  }

  // A Set drops duplicates, so revealing 2♥ twice keeps one 2♥.
  const shown = sortCards([...new Set([...state.revealed[player], ...cards])]);
  return ok({ ...state, revealed: replaceAt(state.revealed, player, shown) });
}

/** `player` turns all their revealed cards face-down again. */
export function hideCards(state: GameState, player: PlayerId): Result<GameState, RevealError> {
  if (!isValidPlayer(player)) {
    return err({ code: 'INVALID_PLAYER' });
  }
  return ok({ ...state, revealed: replaceAt(state.revealed, player, []) });
}

/** After `player` plays `cards`, those cards are no longer "revealed" (they're on the table now). */
export function forgetPlayedCards(
  revealed: readonly Hand[],
  player: PlayerId,
  cards: readonly Card[],
): Hand[] {
  return replaceAt(
    revealed,
    player,
    revealed[player].filter((card) => !cards.includes(card)),
  );
}

/** A copy of `list` with the item at `index` replaced. */
function replaceAt(list: readonly Hand[], index: number, item: Hand): Hand[] {
  return list.map((existing, i) => (i === index ? item : existing));
}