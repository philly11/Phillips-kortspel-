/**
 * A quick check that the server works, without any UI:
 * pretends to be 4 players joining one room, then a 5th who should be refused.
 * Start the server first (pnpm dev), then run this in a second terminal (pnpm smoke).
 */
import { Client, type Room } from '@colyseus/sdk';
import type { LobbyMessage } from '../src/TienLenRoom';

const SERVER = 'http://localhost:2567';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Listen for lobby messages on a connection, then tell the server we're ready. */
function listen(room: Room, label: string) {
  room.onMessage('lobby', (message: LobbyMessage) => {
    console.log(`${label}: code ${message.code}, my seat ${message.yourSeat}, seats taken [${message.seatsTaken.join(', ')}]`);
  });
  room.send('ready', {});
}

async function main() {
  const client = new Client(SERVER);

  const first = await client.create('tienlen');
  console.log(`Created a room. Join code: ${first.roomId}`);
  listen(first, 'player A');

  const others: Room[] = [];
  for (const label of ['player B', 'player C', 'player D']) {
    const room = await client.joinById(first.roomId);
    listen(room, label);
    others.push(room);
    await wait(200);
  }

  await wait(300);
  try {
    await client.joinById(first.roomId);
    console.log('✗ A 5th player got in. That should not happen!');
  } catch {
    console.log('✓ A 5th player was refused: the room is full.');
  }

  for (const room of [first, ...others]) {
    await room.leave();
  }
  console.log('Done.');
}

await main();