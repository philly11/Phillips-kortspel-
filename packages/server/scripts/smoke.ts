/**
 * Checks the server end to end, without any UI. Pretends to be 4 players:
 * they join a room with names, the game starts, some try to cheat, and someone opens with 3♠.
 *
 * Start the server first (pnpm dev), then run this in a second terminal (pnpm smoke).
 */
import { Client, type Room } from '@colyseus/sdk';
import { type PlayerView, cardToString, makeDeck } from '@kortspel/engine';
import type { EventMessage, LobbyMessage, RefusedMessage } from '../src/protocol';

const SERVER = 'http://localhost:2567';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One fake player: a connection plus the latest messages it received. */
interface Player {
  label: string;
  room: Room;
  lobby?: LobbyMessage;
  view?: PlayerView;
  event?: EventMessage;
  refused?: RefusedMessage;
}

function listen(room: Room, label: string): Player {
  const player: Player = { label, room };
  room.onMessage('lobby', (message: LobbyMessage) => (player.lobby = message));
  room.onMessage('view', (message: PlayerView) => (player.view = message));
  room.onMessage('event', (message: EventMessage) => (player.event = message));
  room.onMessage('refused', (message: RefusedMessage) => (player.refused = message));
  room.send('ready', {});
  return player;
}

/** Print ✓ or ✗ for one check. */
function check(passed: boolean, label: string) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
}

async function main() {
  const client = new Client(SERVER);

  // ── Four players meet (one with a messy name, one with none) ──
  const first = await client.create('tienlen', { name: 'Anna' });
  console.log(`Created a room. Join code: ${first.roomId}`);
  const players = [listen(first, 'A')];
  const joinOptions = [{ name: '  Bao  ' }, { name: 'Chi with a very long name indeed' }, {}];
  for (const [index, options] of joinOptions.entries()) {
    players.push(listen(await client.joinById(first.roomId, options), ['B', 'C', 'D'][index]));
  }
  await wait(500);

  const names = players[0].lobby?.players.map((p) => p.name) ?? [];
  console.log(`Names at the table: ${names.map((n) => `"${n}"`).join(', ')}`);
  check(
    names.join('|') === 'Anna|Bao|Chi with a very|Player 4',
    'names are cleaned up: trimmed, cut to 16 characters, and a default for a missing name',
  );

  const views = players.map((p) => p.view);
  check(views.every((v) => v !== undefined), 'all four players received a view when the 4th sat down');
  check(views.every((v) => v !== undefined && !('hands' in v) && !('seed' in v)), 'no view contains other hands or the seed');

  // Who holds 3♠? Every view agrees on whose turn it is.
  const starter = players.find((p) => p.view?.me === p.view?.currentPlayer);
  const someoneElse = players.find((p) => p !== starter);
  if (starter?.view === undefined || someoneElse?.view === undefined) {
    console.log('✗ could not find the starting player; stopping.');
    return;
  }
  console.log(`Player ${starter.label} (seat ${starter.view.me}) starts with: ${starter.view.hand.map(cardToString).join(' ')}`);

  // ── Cheating attempts ──
  someoneElse.room.send('play', { cards: [someoneElse.view.hand[0]] });
  await wait(200);
  check(someoneElse.refused?.code === 'NOT_YOUR_TURN', `player ${someoneElse.label} playing out of turn is refused (NOT_YOUR_TURN)`);

  const notMine = makeDeck().find((card) => !starter.view?.hand.includes(card));
  starter.room.send('play', { cards: [notMine] });
  await wait(200);
  check(starter.refused?.code === 'CARDS_NOT_IN_HAND', `playing a card you don't hold is refused (CARDS_NOT_IN_HAND)`);

  starter.room.send('play', { cards: 'give me all the 2s' });
  await wait(200);
  check(starter.refused?.code === 'BAD_MESSAGE', 'a garbage message is refused (BAD_MESSAGE)');

  // ── A real move: slam the 3♠ ──
  starter.room.send('play', { cards: [0], slam: true });
  await wait(300);
  check(
    players.every((p) => p.view?.table?.cards[0] === 0 && p.view.lastPlay?.slammed === true),
    'everyone sees 3♠ slammed onto the table',
  );
  check(players.every((p) => p.event?.kind === 'play'), 'everyone got a "play" event');

  for (const player of players) {
    await player.room.leave();
  }
  console.log('Done.');
}

await main();