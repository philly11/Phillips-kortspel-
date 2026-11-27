import type { ActionError, BetError, RevealError } from '@kortspel/engine';
import type { RefusedMessage } from '@kortspel/server/protocol';

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

/** A friendly message for every reason a bet can be refused. */
export const BET_ERROR_MESSAGES: Record<BetError['code'], string> = {
  BETTING_OVER: 'Betting is over. Time to play your cards!',
  MUST_CALL: 'Someone bet more than you: call or raise.',
  NOTHING_TO_CALL: 'There is nothing to call: check or raise.',
  BAD_AMOUNT: 'Raise by a whole number of chips (at least 1).',
  NOT_ENOUGH_CHIPS: "You don't have that many chips.",
};

/**
 * Every reason the SERVER can refuse a request: the engine's reasons, plus a few only
 * the server can give (online play). Some codes appear in both lists above; that's fine.
 */
export const REFUSED_MESSAGES: Record<RefusedMessage['code'], string> = {
  ...ERROR_MESSAGES,
  ...REVEAL_ERROR_MESSAGES,
  ...BET_ERROR_MESSAGES,
  WRONG_PHASE: 'Not right now: first everyone bets, then the cards are played.',
  NOT_YOUR_TURN: "It's not your turn yet. Wait for the others.",
  GAME_NOT_STARTED: 'The game has not started yet.',
  BAD_MESSAGE: 'Something went wrong sending that. Try again.',
  GAME_NOT_OVER: 'The game is still going.',
};