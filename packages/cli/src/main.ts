/**
 * Play Tiến Lên in the terminal: 4 players, hot-seat (everyone shares the keyboard).
 *
 * This file is all input/output: reading what you type and printing the table.
 * Every rule decision is made by the engine through applyAction. The CLI never
 * checks legality itself.
 */
import { argv, stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import {
  type Action,
  type ActionError,
  type Card,
  type GameState,
  type Result,
  PLAYER_COUNT,
  applyAction,
  cardToString,
  createGame,
  err,
  isGameOver,
  ok,
  parseCards,
} from '@kortspel/engine';

/** A friendly message for every reason the engine can refuse an action. */
const ERROR_MESSAGES: Record<ActionError['code'], string> = {
  EMPTY: 'Type some cards, or "pass".',
  INVALID_CARD: 'That is not a real card.',
  DUPLICATE_CARD: 'You listed the same card twice.',
  NOT_A_COMBO: 'Those cards are not a combo (single, pair, triple, straight, four of a kind, consecutive pairs).',
  WRONG_TYPE: 'You must play the same kind of combo as the table (or a chop).',
  WRONG_LENGTH: 'You must play the same number of cards as the table.',
  TOO_LOW: 'Too low: your top card must beat the top card on the table.',
  GAME_OVER: 'The game is already over.',
  CARDS_NOT_IN_HAND: 'You do not have those cards.',
  MISSING_REQUIRED_CARD: 'The first play of the game must include 3♠.',
  CANNOT_PASS_ON_LEAD: 'You are leading a new trick, so you cannot pass. Play anything.',
};

const name = (seat: number): string => `Player ${seat + 1}`;
const show = (cards: readonly Card[]): string => cards.map(cardToString).join(' ');

/** Turn what the player typed into an Action, e.g. "pass" or "3s 4s 5s". */
function parseInput(text: string): Result<Action, string> {
  const lower = text.toLowerCase();
  if (lower === 'p' || lower === 'pass') {
    return ok({ type: 'pass' });
  }
  const cards = parseCards(text);
  if (!cards.ok) {
    return err(`I don't understand "${cards.error.input}". Try e.g. 3s, 10d, Qh or 3♠.`);
  }
  return ok({ type: 'play', cards: cards.value });
}

/** Print the table and the current player's hand. */
function printTurn(state: GameState): void {
  const player = state.currentPlayer;
  console.log('\n────────────────────────────────────────');
  if (state.table === null) {
    console.log('Table: empty (new trick)');
  } else {
    console.log(`Table: ${show(state.table.cards)}   played by ${name(state.lastPlayedBy ?? player)}`);
  }

  const others: string[] = [];
  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    if (seat === player) continue;
    const status = state.finished.includes(seat)
      ? 'out'
      : `${state.hands[seat].length} cards${state.passed[seat] ? ', passed' : ''}`;
    others.push(`${name(seat)}: ${status}`);
  }
  console.log(others.join('  |  '));

  console.log(`\n${name(player)}'s turn. Your hand:`);
  console.log(`  ${show(state.hands[player])}`);
  if (state.requiredCard !== null) {
    console.log(`  (Your play must include ${cardToString(state.requiredCard)}.)`);
  }
}

/** Print what changed between two states, e.g. "Player 2 plays 9♠" or "Player 3 is out!". */
function printWhatHappened(before: GameState, after: GameState, action: Action): void {
  const player = before.currentPlayer;
  if (action.type === 'pass') {
    console.log(`→ ${name(player)} passes.`);
  } else {
    console.log(`→ ${name(player)} plays ${show(action.cards)}.`);
  }
  if (after.finished.length > before.finished.length) {
    console.log(`★ ${name(player)} is out of cards! Place: ${after.finished.length}.`);
  }
  if (after.table === null && !isGameOver(after)) {
    console.log(`Everyone passed. ${name(after.currentPlayer)} leads a new trick.`);
  }
}

async function main(): Promise<void> {
  // Randomness lives HERE, outside the engine: pick a seed, or reuse one from the command line.
  const seed = argv[2] !== undefined ? Number(argv[2]) : Date.now() % 1_000_000;
  const created = createGame({ seed });
  if (!created.ok) {
    console.log(`Could not start a game: ${created.error.code}`);
    return;
  }
  let state = created.value;

  console.log(`Tiến Lên: 4 players, hot-seat. Seed ${seed} (run "pnpm start ${seed}" to replay this deal).`);
  console.log('Type cards like "3s 4s 5s" or "3♠ 4♠ 5♠" (s ♠, c ♣, d ♦, h ♥), "pass", or "quit".');

  const rl = createInterface({ input: stdin, output: stdout });

  while (!isGameOver(state)) {
    printTurn(state);
    const text = (await rl.question('> ')).trim();
    if (text === 'quit' || text === 'q') {
      console.log('Bye!');
      rl.close();
      return;
    }

    const action = parseInput(text);
    if (!action.ok) {
      console.log(`✗ ${action.error}`);
      continue;
    }

    const result = applyAction(state, action.value);
    if (!result.ok) {
      console.log(`✗ ${ERROR_MESSAGES[result.error.code]}`);
      continue;
    }

    printWhatHappened(state, result.value, action.value);
    state = result.value;
  }

  rl.close();
  const seats = Array.from({ length: PLAYER_COUNT }, (_, seat) => seat);
  const last = seats.find((seat) => !state.finished.includes(seat));
  console.log('\n════════ Game over ════════');
  [...state.finished, last].forEach((seat, index) => {
    if (seat !== undefined) console.log(`${index + 1}. ${name(seat)}`);
  });
}

await main();