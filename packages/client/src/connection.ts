import { Client } from '@colyseus/sdk';

/**
 * Where the game server lives. On your computer it's localhost:2567.
 * When the game is hosted, set VITE_SERVER_URL (in a .env file or on the host)
 * to the real address; no code changes needed.
 */
const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:2567';

/** One connection helper for the whole app. Rooms are created and joined through it. */
export const gameServer = new Client(SERVER_URL);