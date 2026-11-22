import { type Card, SUIT, RANK, makeCard, makeDeck, sortCards } from './card';
import type { Combo } from './combo';
import { type Result, ok, err } from './result';
import { createRng, shuffle } from './rng';

/** A player is identified by their seat number: 0, 1, 2 or 3. */
export type PlayerId = number;

/** One player's cards, always sorted weakest → strongest. */
export type Hand = readonly Card[];

/** For now the game is always 4 players. 2–3 players come later (see CONTEXT.md). */
export const PLAYER_COUNT = 4;
export const CARDS_PER_PLAYER = 13;

/** 3♠: the lowest card. Its holder leads the first game. */
export const THREE_OF_SPADES = makeCard(RANK.THREE, SUIT.SPADES);

/**
 * A complete snapshot of a game at one moment. The engine never changes a
 * GameState; each action produces a brand-new one (coming in the next step).
 */
export interface GameState {
  /** The seed used to shuffle. Seed + list of actions = the whole game. */
  readonly seed: number;
  /** hands[seat] = that player's cards. */
  readonly hands: readonly Hand[];
  /** Whose turn it is. */
  readonly currentPlayer: PlayerId;
  /** The combo to beat. `null` means a new trick: the leader may play anything. */
  readonly table: Combo | null;
  /** Who played the combo on the table (they lead if everyone else passes). */
  readonly lastPlayedBy: PlayerId | null;
  /** passed[seat] = true if that player has passed and is out of this trick. */
  readonly passed: readonly boolean[];
  /** Players who have run out of cards, in finishing order (1st place first). */
  readonly finished: readonly PlayerId[];
  /** A card the next play must include (3♠ on the first play of a first game). */
  readonly requiredCard: Card | null;
  /** revealed[seat] = cards that player has chosen to show to the whole table (see reveal.ts). */
  readonly revealed: readonly Hand[];
}

export interface CreateGameOptions {
  /** Decides the deal. Pick a fresh one for each real game. */
  readonly seed: number;
  /**
   * The winner of the previous game, who leads this one.
   * Leave it out for the first game: then the holder of 3♠ leads and must play it.
   */
  readonly previousWinner?: PlayerId;
}

export interface GameError {
  readonly code: 'INVALID_PLAYER';
}

/** Shuffle, deal 13 cards to each player, and decide who leads. */
export function createGame(options: CreateGameOptions): Result<GameState, GameError> {
  const { seed, previousWinner } = options;

  if (previousWinner !== undefined && !isValidPlayer(previousWinner)) {
    return err({ code: 'INVALID_PLAYER' });
  }

  const hands = dealHands(seed);
  const isFirstGame = previousWinner === undefined;

  return ok({
    seed,
    hands,
    currentPlayer: isFirstGame ? findHolder(hands, THREE_OF_SPADES) : previousWinner,
    table: null,
    lastPlayedBy: null,
    passed: Array.from({ length: PLAYER_COUNT }, () => false),
    finished: [],
    requiredCard: isFirstGame ? THREE_OF_SPADES : null,
    revealed: Array.from({ length: PLAYER_COUNT }, () => []),
});
}

/** Shuffle a fresh deck with the seed and split it into sorted hands of 13. */
export function dealHands(seed: number): Hand[] {
  const deck = shuffle(makeDeck(), createRng(seed));
  return Array.from({ length: PLAYER_COUNT }, (_, seat) =>
    sortCards(deck.slice(seat * CARDS_PER_PLAYER, (seat + 1) * CARDS_PER_PLAYER)),
  );
}

/** The seat of the player holding `card`. With 4 players every card is dealt, so one always does. */
export function findHolder(hands: readonly Hand[], card: Card): PlayerId {
  return hands.findIndex((hand) => hand.includes(card));
}

/** True if `id` is a whole number from 0 to PLAYER_COUNT - 1. */
export function isValidPlayer(id: number): boolean {
  return Number.isInteger(id) && id >= 0 && id < PLAYER_COUNT;
}