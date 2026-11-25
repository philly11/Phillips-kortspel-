import { type Client, Room } from '@colyseus/core';
import {
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  PLAYER_COUNT,
  applyAction,
  createGame,
  hideCards,
  isGameOver,
  revealCards,
  view,
} from '@kortspel/engine';
import {
  type EventMessage,
  type LobbyMessage,
  MAX_NAME_LENGTH,
  RECONNECT_SECONDS,
  type RefusedMessage,
} from './protocol';

/** Letters for join codes. No I or O, so nobody confuses them with 1 and 0. */
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;

/** Codes in use on this server right now, so two rooms never get the same one. */
const codesInUse = new Set<string>();

/** A fresh, unused 4-letter join code like "KXRT". */
function newJoinCode(): string {
  let code: string;
  do {
    // Math.random is fine HERE: this is the server, not the engine.
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)],
    ).join('');
  } while (codesInUse.has(code));
  codesInUse.add(code);
  return code;
}

// ── Reading untrusted messages ────────────────────────────────────────────
// Anything a client sends could be wrong or malicious (someone can edit their
// browser). So every message is treated as `unknown` and checked before use.

/** Read one field from a message, if the message is an object at all. */
function field(payload: unknown, key: string): unknown {
  if (typeof payload !== 'object' || payload === null) return undefined;
  // Safe: we just checked it's a non-null object; we only READ the field and check its type next.
  return (payload as Record<string, unknown>)[key];
}

/** A list of card numbers, or null if it's anything else. (The engine checks they're 0–51.) */
function cardList(value: unknown): Card[] | null {
  if (!Array.isArray(value)) return null;
  const items: unknown[] = value;
  return items.every((item): item is number => typeof item === 'number') ? items : null;
}

/**
 * Turn whatever name a client sent into a tidy one: text only, no control characters,
 * single spaces, at most MAX_NAME_LENGTH characters. Empty or missing → "Player 3".
 * (We never insert names as HTML, so a name like "<b>hi</b>" just shows as text.)
 */
function cleanName(raw: unknown, seat: PlayerId): string {
  const fallback = `Player ${seat + 1}`;
  if (typeof raw !== 'string') return fallback;
  const name = raw
    .replace(/[\u0000-\u001F\u007F]/g, '') // invisible control characters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return name === '' ? fallback : name;
}

/** One table: up to 4 players, joined with a private code. The server holds the real game. */
export class TienLenRoom extends Room {
  maxClients = PLAYER_COUNT;

  /**
   * Which seat each connection sits in, keyed by Colyseus' sessionId.
   * The SERVER decides who you are: a client can never claim another seat.
   */
  private seats = new Map<string, PlayerId>();

  /** names[seat] = the name of whoever sits there (or null for an empty seat). */
  private names: (string | null)[] = Array.from({ length: PLAYER_COUNT }, () => null);

  /** connected[seat] = false while that player's connection has dropped and we hold their seat. */
  private connected: boolean[] = Array.from({ length: PLAYER_COUNT }, () => false);

  /** The real game. `null` until all four seats are filled. Only the server ever sees all of it. */
  private game: GameState | null = null;

  /** Messages clients can send, by name. The payload is `unknown` until checked. */
  messages = {
    ready: (client: Client) => this.onReady(client),
    play: (client: Client, payload: unknown) => this.onPlay(client, payload),
    pass: (client: Client) => this.onPass(client),
    reveal: (client: Client, payload: unknown) => this.onReveal(client, payload),
    hide: (client: Client) => this.onHide(client),
    nextGame: (client: Client) => this.onNextGame(client),
  };

  // ── Room lifecycle ──────────────────────────────────────────────────────

  onCreate() {
    // Use a short code as the room's ID, so friends can type it in.
    this.roomId = newJoinCode();
    // Private: never listed anywhere. You need the code to get in.
    void this.setPrivate(true);
    console.log(`[${this.roomId}] room created`);
  }

  onJoin(client: Client, options?: unknown) {
    const seat = this.firstFreeSeat();
    this.seats.set(client.sessionId, seat);
    this.names[seat] = cleanName(field(options, 'name'), seat);
    this.connected[seat] = true;
    console.log(`[${this.roomId}] ${this.names[seat]} sat down in seat ${seat}`);
    this.sendLobbyToAll();

    if (this.game === null && this.seats.size === PLAYER_COUNT) {
      this.startGame();
    } else if (this.game !== null) {
      // Someone took over an empty seat mid-game: show them where things stand.
      this.sendView(client);
    }
  }

  /**
   * The connection dropped WITHOUT the player choosing to leave (Wi-Fi blip, tab refreshed,
   * phone went to sleep). Keep their seat and hand for RECONNECT_SECONDS. If they come back,
   * onReconnect runs; if not, Colyseus calls onLeave and the seat is freed.
   */
  async onDrop(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    this.connected[seat] = false;
    console.log(`[${this.roomId}] ${this.names[seat]} dropped; holding seat ${seat} for ${RECONNECT_SECONDS}s`);
    this.sendLobbyToAll();
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      // Time ran out. Nothing to do here: Colyseus calls onLeave next.
    }
  }

  /** A dropped player is back: same seat, same hand. Bring them up to date. */
  onReconnect(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    this.connected[seat] = true;
    console.log(`[${this.roomId}] ${this.names[seat]} reconnected to seat ${seat}`);
    this.sendLobbyToAll();
    this.sendView(client);
  }

  /** The player is gone for good: they pressed Leave, or didn't reconnect in time. */
  onLeave(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (seat !== undefined) {
      console.log(`[${this.roomId}] ${this.names[seat]} left seat ${seat}`);
      this.names[seat] = null;
      this.connected[seat] = false;
    }
    // The seat is freed; the game itself keeps going, and anyone who joins
    // with the code takes over that seat (and its hand).
    this.seats.delete(client.sessionId);
    this.sendLobbyToAll();
  }

  onDispose() {
    // The room is gone: its code may be reused.
    codesInUse.delete(this.roomId);
    console.log(`[${this.roomId}] room closed`);
  }

  // ── Messages from clients ───────────────────────────────────────────────

  /** "I'm listening now": send the current picture (lobby, and the game if it's running). */
  private onReady(client: Client) {
    this.sendLobby(client);
    this.sendView(client);
  }

  private onPlay(client: Client, payload: unknown) {
    const cards = cardList(field(payload, 'cards'));
    if (cards === null) {
      return this.refuse(client, 'BAD_MESSAGE');
    }
    const slam = field(payload, 'slam') === true;
    this.takeTurn(client, { type: 'play', cards, slam });
  }

  private onPass(client: Client) {
    this.takeTurn(client, { type: 'pass' });
  }

  /** The taunt: allowed any time, even when it's not your turn. */
  private onReveal(client: Client, payload: unknown) {
    const seat = this.seats.get(client.sessionId);
    const cards = cardList(field(payload, 'cards'));
    if (this.game === null || seat === undefined) {
      return this.refuse(client, 'GAME_NOT_STARTED');
    }
    if (cards === null) {
      return this.refuse(client, 'BAD_MESSAGE');
    }
    const result = revealCards(this.game, seat, cards);
    if (!result.ok) {
      return this.refuse(client, result.error.code);
    }
    this.update(result.value, { kind: 'reveal', seat, cards });
  }

  private onHide(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (this.game === null || seat === undefined) {
      return this.refuse(client, 'GAME_NOT_STARTED');
    }
    const result = hideCards(this.game, seat);
    if (!result.ok) {
      return this.refuse(client, result.error.code);
    }
    this.update(result.value, { kind: 'hide', seat });
  }

  /** After a game ends, anyone can start the next one. The winner leads it. */
  private onNextGame(client: Client) {
    if (this.game === null) {
      return this.refuse(client, 'GAME_NOT_STARTED');
    }
    if (!isGameOver(this.game)) {
      return this.refuse(client, 'GAME_NOT_OVER');
    }
    this.startGame(this.game.finished[0]);
  }

  // ── The core rule of an authoritative server ────────────────────────────

  /**
   * A play or a pass. Three checks, in order:
   * 1. Is there a game?  2. Is it THIS player's turn?  3. Does the engine allow it?
   */
  private takeTurn(client: Client, action: Action) {
    const seat = this.seats.get(client.sessionId);
    if (this.game === null || seat === undefined) {
      return this.refuse(client, 'GAME_NOT_STARTED');
    }
    if (seat !== this.game.currentPlayer) {
      return this.refuse(client, 'NOT_YOUR_TURN');
    }
    const result = applyAction(this.game, action);
    if (!result.ok) {
      return this.refuse(client, result.error.code);
    }
    this.update(
      result.value,
      action.type === 'play'
        ? { kind: 'play', seat, cards: action.cards, slam: action.slam ?? false }
        : { kind: 'pass', seat },
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private startGame(previousWinner?: PlayerId) {
    // The seed is picked here, on the server, and never sent to anyone.
    const result = createGame({ seed: Math.floor(Math.random() * 1_000_000), previousWinner });
    if (!result.ok) {
      console.error(`[${this.roomId}] could not start a game: ${result.error.code}`);
      return;
    }
    console.log(`[${this.roomId}] game started`);
    this.update(result.value, { kind: 'gameStarted' });
  }

  /** Store the new state, tell everyone what happened, and send each player their own view. */
  private update(next: GameState, event: EventMessage) {
    this.game = next;
    for (const client of this.clients) {
      client.send('event', event);
      this.sendView(client);
    }
  }

  /** Send ONE player THEIR view: their own hand, and only card counts for everyone else. */
  private sendView(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (this.game === null || seat === undefined) return;
    const result = view(this.game, seat);
    if (result.ok) {
      client.send('view', result.value);
    }
  }

  private refuse(client: Client, code: RefusedMessage['code']) {
    const message: RefusedMessage = { code };
    client.send('refused', message);
  }

  /** The lowest seat number nobody is sitting in. */
  private firstFreeSeat(): PlayerId {
    const taken = new Set(this.seats.values());
    for (let seat = 0; seat < PLAYER_COUNT; seat++) {
      if (!taken.has(seat)) return seat;
    }
    // Can't happen: Colyseus refuses joins beyond maxClients. Fail loudly if it ever does.
    throw new Error('No free seat');
  }

  private sendLobby(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    const message: LobbyMessage = {
      code: this.roomId,
      yourSeat: seat,
      players: [...this.seats.values()]
        .sort((a, b) => a - b)
        .map((s) => ({ seat: s, name: this.names[s] ?? `Player ${s + 1}`, connected: this.connected[s] })),
    };
    client.send('lobby', message);
  }

  private sendLobbyToAll() {
    for (const client of this.clients) {
      this.sendLobby(client);
    }
  }
}