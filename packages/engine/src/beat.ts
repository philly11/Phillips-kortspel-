import { RANK, rankOf } from './card';
import type { Combo } from './combo';
import { type Result, ok, err } from './result';

/**
 * How a play beat the table:
 * - 'normal': same type, same length, higher top card.
 * - 'chop' (chặt): a special combo beat 2s or another chop combo.
 */
export type BeatKind = 'normal' | 'chop';

/** Why a play does NOT beat the table. The client can turn these into messages. */
export interface BeatError {
  readonly code: 'WRONG_TYPE' | 'WRONG_LENGTH' | 'TOO_LOW';
}

/**
 * Does `play` beat the combo currently on the table?
 *
 * 1. Chopping is checked first, because it ignores the "same type" rule.
 * 2. Normal rule: same combo type, same number of cards, and a higher top card.
 *    Thanks to the card encoding, "higher top card" (rank first, then suit)
 *    is a plain number comparison.
 */
export function checkBeat(table: Combo, play: Combo): Result<BeatKind, BeatError> {
  if (canChop(table, play)) {
    return ok('chop');
  }
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

/**
 * The chopping (chặt) rules:
 * - 3 consecutive pairs chop a single 2.
 * - Four of a kind chops a single 2, a pair of 2s, or 3 consecutive pairs.
 * - 4 (or more) consecutive pairs chop all of the above, and four of a kind.
 *
 * A chop works no matter how low the chopping cards are: 3-3-4-4-5-5 chops 2♥.
 */
function canChop(table: Combo, play: Combo): boolean {
  const tableIsSingleTwo = table.type === 'single' && isTwo(table);
  const tableIsPairOfTwos = table.type === 'pair' && isTwo(table);
  const tableIsThreePairs = table.type === 'consecutive-pairs' && pairCount(table) === 3;
  const tableIsFourOfAKind = table.type === 'four-of-a-kind';

  if (play.type === 'consecutive-pairs' && pairCount(play) === 3) {
    return tableIsSingleTwo;
  }
  if (play.type === 'four-of-a-kind') {
    return tableIsSingleTwo || tableIsPairOfTwos || tableIsThreePairs;
  }
  if (play.type === 'consecutive-pairs' && pairCount(play) >= 4) {
    return tableIsSingleTwo || tableIsPairOfTwos || tableIsThreePairs || tableIsFourOfAKind;
  }
  return false;
}

/** True if the combo is made of 2s (checked via its top card). */
function isTwo(combo: Combo): boolean {
  return rankOf(combo.top) === RANK.TWO;
}

/** How many pairs a consecutive-pairs combo has (6 cards = 3 pairs). */
function pairCount(combo: Combo): number {
  return combo.cards.length / 2;
}