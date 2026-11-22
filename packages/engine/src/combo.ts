import { type Card, RANK, isValidCard, rankOf, sortCards } from './card';
import { type Result, ok, err } from './result';

/**
 * The kinds of combo a player can lay down.
 */
export type ComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'four-of-a-kind'
  | 'straight'
  | 'consecutive-pairs';

/** A straight needs at least this many cards. */
export const MIN_STRAIGHT_LENGTH = 3;

/** Consecutive pairs need at least this many pairs (3 pairs = 6 cards). */
export const MIN_CONSECUTIVE_PAIRS = 3;

/** A recognised, legal-shaped group of cards. */
export interface Combo {
  readonly type: ComboType;
  /** The cards, sorted weakest → strongest. */
  readonly cards: readonly Card[];
  /**
   * The strongest card in the combo. Two combos of the same type and
   * length are compared by their top card (rank first, then suit).
   */
  readonly top: Card;
}

/** Why a group of cards is not a combo. */
export interface ComboError {
  readonly code: 'EMPTY' | 'INVALID_CARD' | 'DUPLICATE_CARD' | 'NOT_A_COMBO';
}

/**
 * Look at some cards and say which combo they form, if any.
 * This only checks the SHAPE of the play. Whether it beats the
 * current trick, or whether the player owns the cards, is checked elsewhere.
 */
export function detectCombo(cards: readonly Card[]): Result<Combo, ComboError> {
  if (cards.length === 0) {
    return err({ code: 'EMPTY' });
  }
  if (!cards.every(isValidCard)) {
    return err({ code: 'INVALID_CARD' });
  }
  if (new Set(cards).size !== cards.length) {
    return err({ code: 'DUPLICATE_CARD' });
  }

  const sorted = sortCards(cards);

  if (allSameRank(sorted)) {
    switch (sorted.length) {
      case 1:
        return ok(makeCombo('single', sorted));
      case 2:
        return ok(makeCombo('pair', sorted));
      case 3:
        return ok(makeCombo('triple', sorted));
      case 4:
        return ok(makeCombo('four-of-a-kind', sorted));
    }
  }

  if (sorted.length >= MIN_STRAIGHT_LENGTH && isStraight(sorted)) {
    return ok(makeCombo('straight', sorted));
  }

  if (sorted.length >= MIN_CONSECUTIVE_PAIRS * 2 && isConsecutivePairs(sorted)) {
    return ok(makeCombo('consecutive-pairs', sorted));
  }

  return err({ code: 'NOT_A_COMBO' });
}

/** True if every card has the same rank as the first one. */
function allSameRank(cards: readonly Card[]): boolean {
  const firstRank = rankOf(cards[0]); // safe: detectCombo already rejected empty lists
  return cards.every((card) => rankOf(card) === firstRank);
}

/**
 * True if the sorted cards have consecutive ranks with no 2s, e.g. 3-4-5 or Q-K-A.
 * Ranks must go up by exactly 1 each time, so repeated ranks and gaps both fail.
 */
function isStraight(sorted: readonly Card[]): boolean {
  if (containsTwo(sorted)) {
    return false;
  }
  for (let i = 1; i < sorted.length; i++) {
    if (rankOf(sorted[i]) !== rankOf(sorted[i - 1]) + 1) {
      return false;
    }
  }
  return true;
}

/**
 * True if the sorted cards are pairs with consecutive ranks and no 2s,
 * e.g. 3-3-4-4-5-5. Sorting puts each pair's two cards next to each other,
 * so we can walk the list two cards at a time.
 */
function isConsecutivePairs(sorted: readonly Card[]): boolean {
  if (sorted.length % 2 !== 0 || containsTwo(sorted)) {
    return false;
  }
  for (let i = 0; i < sorted.length; i += 2) {
    const rank = rankOf(sorted[i]);
    // Both cards of this pair must have the same rank...
    if (rankOf(sorted[i + 1]) !== rank) {
      return false;
    }
    // ...and each pair must be exactly one rank above the previous pair.
    if (i > 0 && rank !== rankOf(sorted[i - 2]) + 1) {
      return false;
    }
  }
  return true;
}

/** True if any card is a 2. Sequences (straights, consecutive pairs) can't contain 2s. */
function containsTwo(cards: readonly Card[]): boolean {
  return cards.some((card) => rankOf(card) === RANK.TWO);
}

/** Build a Combo from cards that are already sorted. */
function makeCombo(type: ComboType, sorted: readonly Card[]): Combo {
  return { type, cards: sorted, top: sorted[sorted.length - 1] };
}