import { type Card, RANK, isValidCard, rankOf, sortCards } from './card';
import { type Result, ok, err } from './result';

/**
 * The kinds of combo a player can lay down.
 * More kinds (four of a kind, consecutive pairs) are added in later steps.
 */
export type ComboType = 'single' | 'pair' | 'triple' | 'straight';

/** A straight needs at least this many cards. */
export const MIN_STRAIGHT_LENGTH = 3;

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
    }
  }

  if (sorted.length >= MIN_STRAIGHT_LENGTH && isStraight(sorted)) {
    return ok(makeCombo('straight', sorted));
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
  if (sorted.some((card) => rankOf(card) === RANK.TWO)) {
    return false;
  }
  for (let i = 1; i < sorted.length; i++) {
    if (rankOf(sorted[i]) !== rankOf(sorted[i - 1]) + 1) {
      return false;
    }
  }
  return true;
}

/** Build a Combo from cards that are already sorted. */
function makeCombo(type: ComboType, sorted: readonly Card[]): Combo {
  return { type, cards: sorted, top: sorted[sorted.length - 1] };
}