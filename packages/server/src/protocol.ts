/**
 * The "language" the server and the clients speak: every message name and its shape.
 * Both sides import these types, so they can never disagree about a message.
 *
 *   Client → server: 'ready', 'play', 'pass', 'reveal', 'hide', 'nextGame'
 *   Server → client: 'lobby', 'view', 'event', 'refused'
 */
import type { ActionError, Card, PlayerId, PlayerView, RevealError } from '@kortspel/engine';

// ── Client → server ──────────────────────────────────────────────────────

/**
 * Join options: sent once, with `client.create('tienlen', options)` or
 * `client.joinById(code, options)`. The server cleans the name up (see MAX_NAME_LENGTH).
 */
export interface JoinOptions {
  readonly name?: string;
}

/** Names are trimmed and cut to at most this many characters. */
export const MAX_NAME_LENGTH = 16;

/** 'play': play these cards, optionally slamming them. */
export interface PlayRequest {
  readonly cards: readonly Card[];
  readonly slam?: boolean;
}

/** 'reveal': show these cards to the table (the taunt). */
export interface RevealRequest {
  readonly cards: readonly Card[];
}

// ('ready', 'pass', 'hide' and 'nextGame' carry no data.)

// ── Server → client ──────────────────────────────────────────────────────

/** One person sitting at the table. */
export interface SeatedPlayer {
  readonly seat: PlayerId;
  readonly name: string;
}

/** 'lobby': who is in the room. Sent whenever someone joins or leaves. */
export interface LobbyMessage {
  /** The join code to share with friends. */
  readonly code: string;
  /** Which seat you sit in (0–3). */
  readonly yourSeat: PlayerId;
  /** Everyone at the table (including you), sorted by seat. */
  readonly players: readonly SeatedPlayer[];
}

/** 'view': your personal view of the game. Never contains other players' hands. */
export type ViewMessage = PlayerView;

/** 'event': something just happened at the table (for messages like "Player 2 passed"). */
export type EventMessage =
  | { readonly kind: 'gameStarted' }
  | { readonly kind: 'play'; readonly seat: PlayerId; readonly cards: readonly Card[]; readonly slam: boolean }
  | { readonly kind: 'pass'; readonly seat: PlayerId }
  | { readonly kind: 'reveal'; readonly seat: PlayerId; readonly cards: readonly Card[] }
  | { readonly kind: 'hide'; readonly seat: PlayerId };

/** Reasons only the server can give (on top of the engine's own error codes). */
export type ServerErrorCode =
  | 'GAME_NOT_STARTED' // the room isn't full yet
  | 'NOT_YOUR_TURN' // someone else must play or pass first
  | 'BAD_MESSAGE' // the message didn't have the right shape
  | 'GAME_NOT_OVER'; // 'nextGame' while a game is still running

/** 'refused': why your last request was not allowed. Only sent to you. */
export interface RefusedMessage {
  readonly code: ActionError['code'] | RevealError['code'] | ServerErrorCode;
}