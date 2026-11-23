/**
 * Starts the Tiến Lên game server.
 * Clients connect to ws://localhost:2567 (or the PORT environment variable, when hosted).
 */
import { defineRoom, defineServer } from '@colyseus/core';
import { TienLenRoom } from './TienLenRoom';

const port = Number(process.env.PORT ?? 2567);

const server = defineServer({
  rooms: {
    // Clients create or join rooms of this type by its name: 'tienlen'.
    tienlen: defineRoom(TienLenRoom),
  },
});

await server.listen(port);
console.log(`Tiến Lên server listening on ws://localhost:${port}`);