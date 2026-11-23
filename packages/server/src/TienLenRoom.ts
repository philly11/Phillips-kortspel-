import { type Client, Room } from '@colyseus/core';
import { type PlayerId, PLAYER_COUNT } from '@kortspel/engine';

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

/** What the server tells each player about the room (before the game starts). */
export interface LobbyMessage {
  /** The join code to share with friends. */
  readonly code: string;
  /** Which seat you sit in (0–3). */
  readonly yourSeat: PlayerId;
  /** Which seats are taken, including yours. */
  readonly seatsTaken: readonly PlayerId[];
}

/** One table: up to 4 players, joined with a private code. */
export class TienLenRoom extends Room {
  maxClients = PLAYER_COUNT;

  /**
   * Which seat each connection sits in, keyed by Colyseus' sessionId.
   * The SERVER decides who you are: a client can never claim another seat.
   */
  private seats = new Map<string, PlayerId>();

  /** Messages clients can send, by name. */
  messages = {
    /** Sent by a client right after joining: "I'm listening now, tell me about the room." */
    ready: (client: Client) => this.sendLobby(client),
  };

  onCreate() {
    // Use a short code as the room's ID, so friends can type it in.
    this.roomId = newJoinCode();
    // Private: never listed anywhere. You need the code to get in.
    void this.setPrivate(true);
    console.log(`[${this.roomId}] room created`);
  }

  onJoin(client: Client) {
    const seat = this.firstFreeSeat();
    this.seats.set(client.sessionId, seat);
    console.log(`[${this.roomId}] ${client.sessionId} sat down in seat ${seat}`);
    this.sendLobbyToAll();
  }

  onLeave(client: Client) {
    console.log(`[${this.roomId}] ${client.sessionId} left seat ${this.seats.get(client.sessionId)}`);
    this.seats.delete(client.sessionId);
    this.sendLobbyToAll();
  }

  onDispose() {
    // The room is gone: its code may be reused.
    codesInUse.delete(this.roomId);
    console.log(`[${this.roomId}] room closed`);
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
      seatsTaken: [...this.seats.values()].sort(),
    };
    client.send('lobby', message);
  }

  private sendLobbyToAll() {
    for (const client of this.clients) {
      this.sendLobby(client);
    }
  }
}