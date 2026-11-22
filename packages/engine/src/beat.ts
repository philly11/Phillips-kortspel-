import type { Combo } from './combo';
import { type Result, ok, err } from './result';

/**
 * How a play beat the table. For now only 'normal'.
 * 'chop' (chặt) is added in the next step.
 */
export type BeatKind = 'normal';

/** Why a play does NOT beat the table. The client can turn these into messages. */
export interface BeatError {
  readonly code: 'WRONG_TYPE' | 'WRONG_LENGTH' | 'TOO_LOW';
}

/**
 * Does `play` beat the combo currently on the table?
 *
 * Normal rule: same combo type, same number of cards, and a higher top card.
 * Thanks to the card encoding, "higher top card" (rank first, then suit)
 * is a plain number comparison.
 */
export function checkBeat(table: Combo, play: Combo): Result<BeatKind, BeatError> {
  if (play.type !== table.type) {
    return err({ code: 'WRONG_TYPE' });
  }
  if (play.cards.length !== table.cards.length) {
    return err({ code: 'WRONG_LENGTH' });
  }
  if (play.top <= table.top) {
    return err({ code: 'TOO_LOW' });
  }
  return ok('normal');
}