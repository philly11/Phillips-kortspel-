/**
 * Checks the server end to end, without any UI. Pretends to be 4 players:
 * the creator picks chip settings, everyone joins, they bet, some try to cheat,
 * and someone opens with 3♠.
 *
 * Start the server first (pnpm dev), then run this in a second terminal (pnpm smoke).
 */
import { Client, type Room } from '@colyseus/sdk';
import { type MatchView, cardToString, makeDeck } from '@kortspel/engine';
import type { EventMessage, LobbyMessage, RefusedMessage } from '../src/protocol';

const SERVER = 'http://localhost:2567';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One fake player: a connection plus the latest messages it received. */
interface Player {
  label: string;
  room: Room;
  lobby?: LobbyMessage;
  view?: MatchView;
  event?: EventMessage;
  refused?: RefusedMessage;
}

function listen(room: Room, label: string): Player {
  const player: Player = { label, room };
  room.onMessage('lobby', (message: LobbyMessage) => (player.lobby = message));
  room.onMessage('view', (message: MatchView) => (player.view = message));
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

  // ── The creator picks the chips. Some values are messy on purpose. ──
  const first = await client.create('tienlen', {
    name: 'Anna',
    rules: { startingChips: 50.9, ante: 3, trickBonus: 'lots', chopPayment: -4 },
  });
  console.log(`Created a room. Join code: ${first.roomId}`);
  const players = [listen(first, 'A')];
  // Joiners try to change the rules too: they must be ignored.
  const joinOptions = [{ name: '  Bao  ', rules: { startingChips: 9999 } }, { name: 'Chi with a very long name indeed' }, {}];
  for (const [index, options] of joinOptions.entries()) {
    players.push(listen(await client.joinById(first.roomId, options), ['B', 'C', 'D'][index]));
  }
  await wait(500);

  const names = players[0].lobby?.players.map((p) => p.name) ?? [];
  check(names.join('|') === 'Anna|Bao|Chi with a very|Player 4', 'names are cleaned up');

  const views = players.map((p) => p.view);
  check(views.every((v) => v !== undefined), 'all four players received a view when the 4th sat down');
  check(
    views.every((v) => v !== undefined && !('hands' in v.game) && !('seed' in v.game)),
    'no view contains other hands or the seed',
  );

  const firstView = players[0].view;
  if (firstView === undefined) return;
  console.log(`Rules: ${JSON.stringify(firstView.rules)}`);
  check(
    JSON.stringify(firstView.rules) === JSON.stringify({ startingChips: 50, ante: 3, trickBonus: 2, chopPayment: 0 }),
    "the creator's rules are cleaned up (50.9 → 50, 'lots' → default 2, -4 → 0); the joiner's are ignored",
  );
  check(firstView.phase === 'betting', 'the game starts with the betting round');
  check(firstView.stacks.join(',') === '47,47,47,47' && firstView.pot === 12, 'everyone paid the ante of 3 (pot 12)');

  // Who bets first? The player who will lead the game (holder of 3♠).
  const bettor = players.find((p) => p.view?.game.me === p.view?.betting.toAct);
  const someoneElse = players.find((p) => p !== bettor);
  if (bettor?.view === undefined || someoneElse?.view === undefined) {
    console.log('✗ could not find the first bettor; stopping.');
    return;
  }
  console.log(`Player ${bettor.label} (seat ${bettor.view.game.me}) bets first and holds: ${bettor.view.game.hand.map(cardToString).join(' ')}`);

  // ── Cheating attempts during betting ──
  bettor.room.send('play', { cards: [0] });
  await wait(200);
  check(bettor.refused?.code === 'WRONG_PHASE', 'playing a card during betting is refused (WRONG_PHASE)');

  someoneElse.room.send('bet', { type: 'check' });
  await wait(200);
  check(someoneElse.refused?.code === 'NOT_YOUR_TURN', 'betting out of turn is refused (NOT_YOUR_TURN)');

  bettor.room.send('bet', { type: 'raise', amount: 'a million' });
  await wait(200);
  check(bettor.refused?.code === 'BAD_MESSAGE', 'a garbage bet is refused (BAD_MESSAGE)');

  bettor.room.send('bet', { type: 'raise', amount: 1000 });
  await wait(200);
  check(bettor.refused?.code === 'NOT_ENOUGH_CHIPS', 'raising more than you have is refused (NOT_ENOUGH_CHIPS)');

  // ── Real bets: raise 10, everyone else calls ──
  bettor.room.send('bet', { type: 'raise', amount: 10 });
  await wait(200);
  for (let step = 1; step < 4; step++) {
    const seat = (bettor.view.game.me + step) % 4;
    const caller = players.find((p) => p.view?.game.me === seat);
    caller?.room.send('bet', { type: 'call' });
    await wait(200);
  }
  check(
    players.every((p) => p.view?.phase === 'playing' && p.view.pot === 52 && p.view.stacks.join(',') === '37,37,37,37'),
    'after a raise of 10 and three calls: everyone has 37, the pot is 52, and play begins',
  );

  // ── Card cheats still refused, then a real move: slam the 3♠ ──
  const notMine = makeDeck().find((card) => !bettor.view?.game.hand.includes(card));
  bettor.room.send('play', { cards: [notMine] });
  await wait(200);
  check(bettor.refused?.code === 'CARDS_NOT_IN_HAND', `playing a card you don't hold is refused (CARDS_NOT_IN_HAND)`);

  bettor.room.send('play', { cards: [0], slam: true });
  await wait(300);
  check(
    players.every((p) => p.view?.game.table?.cards[0] === 0 && p.view.game.lastPlay?.slammed === true),
    'everyone sees 3♠ slammed onto the table',
  );

  for (const player of players) {
    await player.room.leave();
  }
  console.log('Done.');
}

await main();