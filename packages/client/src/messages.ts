import type { ActionError, RevealError } from '@kortspel/engine';

/**
 * A friendly message for every reason the engine can refuse an action.
 * The engine decides WHAT is wrong; this file only decides how to SAY it.
 */
export const ERROR_MESSAGES: Record<ActionError['code'], string> = {
  EMPTY: 'Pick some cards first, or pass.',
  INVALID_CARD: 'That is not a real card.',
  DUPLICATE_CARD: 'You picked the same card twice.',
  NOT_A_COMBO: 'Those cards are not a combo (single, pair, triple, straight, four of a kind, consecutive pairs).',
  WRONG_TYPE: 'You must play the same kind of combo as the table (or a chop).',
  WRONG_LENGTH: 'You must play the same number of cards as the table.',
  TOO_LOW: 'Too low: your top card must beat the top card on the table.',
  GAME_OVER: 'The game is already over.',
  CARDS_NOT_IN_HAND: 'You do not have those cards.',
  MISSING_REQUIRED_CARD: 'The first play of the game must include 3♠.',
  CANNOT_PASS_ON_LEAD: 'You are leading a new trick, so you cannot pass. Play anything.',
};

/** A friendly message for every reason the engine can refuse a reveal (the taunt). */
export const REVEAL_ERROR_MESSAGES: Record<RevealError['code'], string> = {
  INVALID_PLAYER: 'That player does not exist.',
  EMPTY: 'Select the cards you want to show first.',
  CARDS_NOT_IN_HAND: 'You can only show cards you actually have.',
};