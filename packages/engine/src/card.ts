/**
 * A card is one integer from 0 to 51: rank * 4 + suit.
 *
 *   rank: 0 = 3, 1 = 4, ... 8 = J, 9 = Q, 10 = K, 11 = A, 12 = 2
 *   suit: 0 = ♠, 1 = ♣, 2 = ♦, 3 = ♥
 *
 * Because rank is multiplied by 4, a higher rank always beats any suit,
 * and within the same rank the suit decides. So "is card a stronger
 * than card b?" is simply `a > b`.
 */
export type Card = number;

/** Named suits, so code reads `SUIT.HEARTS` instead of a magic `3`. */
export const SUIT = {
  SPADES: 0,
  CLUBS: 1,
  DIAMONDS: 2,
  HEARTS: 3,
} as const;

/** Named ranks. Note that THREE is the lowest and TWO is the highest. */
export const RANK = {
  THREE: 0,
  FOUR: 1,
  FIVE: 2,
  SIX: 3,
  SEVEN: 4,
  EIGHT: 5,
  NINE: 6,
  TEN: 7,
  JACK: 8,
  QUEEN: 9,
  KING: 10,
  ACE: 11,
  TWO: 12,
} as const;

export const RANK_LABELS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export const SUIT_SYMBOLS = ['♠', '♣', '♦', '♥'] as const;

export const DECK_SIZE = 52;

/** Build a card from a rank (0–12) and a suit (0–3). */
export function makeCard(rank: number, suit: number): Card {
  return rank * 4 + suit;
}

/** The rank (0–12) of a card. */
export function rankOf(card: Card): number {
  return Math.floor(card / 4);
}

/** The suit (0–3) of a card. */
export function suitOf(card: Card): number {
  return card % 4;
}

/** True if the value is a whole number from 0 to 51. */
export function isValidCard(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < DECK_SIZE;
}

/** Human-readable form, e.g. "10♦". Handy for tests, logs and the CLI. */
export function cardToString(card: Card): string {
  return `${RANK_LABELS[rankOf(card)]}${SUIT_SYMBOLS[suitOf(card)]}`;
}

/** A fresh, ordered deck: 3♠, 3♣, 3♦, 3♥, 4♠ ... 2♥. Shuffling comes later (seeded RNG). */
export function makeDeck(): Card[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i);
}

/** Returns a NEW array sorted weakest → strongest. The input is not changed. */
export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => a - b);
}