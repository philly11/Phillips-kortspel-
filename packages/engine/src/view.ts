import type { Card } from './card';
import type { Combo } from './combo';
import { type GameState, type Hand, type PlayerId, isValidPlayer } from './game';
import { type Result, ok, err } from './result';

/**
 * What ONE player is allowed to know. Clients and bots only ever get this,
 * never the full GameState.
 *
 * Deliberately missing:
 * - other players' hands (only how many cards they hold)
 * - the seed (with the seed, anyone could re-deal and see every hand!)
 */
export interface PlayerView {
  /** Whose view this is. */
  readonly me: PlayerId;
  /** My own cards. */
  readonly hand: Hand;
  /** cardCounts[seat] = how many cards that player holds. */
  readonly cardCounts: readonly number[];
  readonly currentPlayer: PlayerId;
  readonly table: Combo | null;
  readonly lastPlayedBy: PlayerId | null;
  readonly passed: readonly boolean[];
  readonly finished: readonly PlayerId[];
  readonly requiredCard: Card | null;
}

export interface ViewError {
  readonly code: 'INVALID_PLAYER';
}

/**
 * Build the view for `playerId`.
 *
 * Every field is copied by name (an "allowlist"). If we add a secret field to
 * GameState later, it can't leak by accident: it stays hidden until someone
 * deliberately adds it here.
 */
export function view(state: GameState, playerId: PlayerId): Result<PlayerView, ViewError> {
  if (!isValidPlayer(playerId)) {
    return err({ code: 'INVALID_PLAYER' });
  }
  return ok({
    me: playerId,
    hand: state.hands[playerId],
    cardCounts: state.hands.map((hand) => hand.length),
    currentPlayer: state.currentPlayer,
    table: state.table,
    lastPlayedBy: state.lastPlayedBy,
    passed: state.passed,
    finished: state.finished,
    requiredCard: state.requiredCard,
  });
}