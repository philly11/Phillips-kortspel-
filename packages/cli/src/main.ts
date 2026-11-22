/**
 * Play Tiến Lên in the terminal: 4 players, hot-seat (everyone shares the keyboard).
 *
 * This file is all input/output: reading what you type and printing the table.
 * Every rule decision is made by the engine. The CLI never checks legality itself.
 *
 * In hot-seat, the CLI plays the role a server will play later: it holds the full
 * GameState, but only ever SHOWS a player their own view(state, playerId).
 */
import { argv, stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import {
  type Action,
  type ActionError,
  type Card,
  type GameState,
  type PlayerView,
  type Result,
  type RevealError,
  PLAYER_COUNT,
  applyAction,
  cardToString,
  createGame,
  err,
  hideCards,
  isGameOver,
  ok,
  parseCards,
  revealCards,
  view,
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

/** A friendly message for every reason the engine can refuse a reveal. */
const REVEAL_ERROR_MESSAGES: Record<RevealError['code'], string> = {
  INVALID_PLAYER: 'That player does not exist.',
  EMPTY: 'Say which cards to show, e.g. "show 2h 2c".',
  CARDS_NOT_IN_HAND: 'You can only show cards you actually have.',
};

/** Everything the player can type. */
type Command =
  | { readonly kind: 'action'; readonly action: Action }
  | { readonly kind: 'show'; readonly cards: readonly Card[] }
  | { readonly kind: 'hide' };

const name = (seat: number): string => `Player ${seat + 1}`;
const show = (cards: readonly Card[]): string => cards.map(cardToString).join(' ');

/** Turn what the player typed into a Command, e.g. "pass", "show 2h", "hide" or "3s 4s 5s". */
function parseInput(text: string): Result<Command, string> {
  const lower = text.toLowerCase();
  if (lower === 'p' || lower === 'pass') {
    return ok({ kind: 'action', action: { type: 'pass' } });
  }
  if (lower === 'hide') {
    return ok({ kind: 'hide' });
  }

  const isShow = lower.startsWith('show');
  const cardText = isShow ? text.slice('show'.length) : text;
  const cards = parseCards(cardText);
  if (!cards.ok) {
    return err(`I don't understand "${cards.error.input}". Try e.g. 3s, 10d, Qh or 3♠.`);
  }
  return ok(
    isShow
      ? { kind: 'show', cards: cards.value }
      : { kind: 'action', action: { type: 'play', cards: cards.value } },
  );
}

/** Print the table from ONE player's point of view. */
function printTurn(v: PlayerView): void {
  console.log('\n────────────────────────────────────────');
  if (v.table === null) {
    console.log('Table: empty (new trick)');
  } else {
    console.log(`Table: ${show(v.table.cards)}   played by ${name(v.lastPlayedBy ?? v.me)}`);
  }

  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    if (seat === v.me) continue;
    const status = v.finished.includes(seat)
      ? 'out'
      : `${v.cardCounts[seat]} cards${v.passed[seat] ? ', passed' : ''}`;
    const showing = v.revealed[seat].length > 0 ? `, showing ${show(v.revealed[seat])}` : '';
    console.log(`  ${name(seat)}: ${status}${showing}`);
  }

  console.log(`\n${name(v.me)}'s turn. Your hand:`);
  console.log(`  ${show(v.hand)}`);
  if (v.revealed[v.me].length > 0) {
    console.log(`  (You are showing ${show(v.revealed[v.me])} to the table.)`);
  }
  if (v.requiredCard !== null) {
    console.log(`  (Your play must include ${cardToString(v.requiredCard)}.)`);
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
  console.log('Taunt the table with "show 2h 2c", and turn them face-down again with "hide".');

  const rl = createInterface({ input: stdin, output: stdout });

  while (!isGameOver(state)) {
    const me = state.currentPlayer;
    const myView = view(state, me);
    if (!myView.ok) {
      console.log(`Something went wrong: ${myView.error.code}`);
      break;
    }
    printTurn(myView.value);

    const text = (await rl.question('> ')).trim();
    if (text === 'quit' || text === 'q') {
      console.log('Bye!');
      rl.close();
      return;
    }

    const command = parseInput(text);
    if (!command.ok) {
      console.log(`✗ ${command.error}`);
      continue;
    }

    // Taunts: reveal or hide. They never use up your turn.
    if (command.value.kind === 'show' || command.value.kind === 'hide') {
      const result =
        command.value.kind === 'show'
          ? revealCards(state, me, command.value.cards)
          : hideCards(state, me);
      if (!result.ok) {
        console.log(`✗ ${REVEAL_ERROR_MESSAGES[result.error.code]}`);
        continue;
      }
      console.log(
        command.value.kind === 'show'
          ? `😈 ${name(me)} shows ${show(command.value.cards)} to the table!`
          : `🙈 ${name(me)} hides their cards again.`,
      );
      state = result.value;
      continue;
    }

    const result = applyAction(state, command.value.action);
    if (!result.ok) {
      console.log(`✗ ${ERROR_MESSAGES[result.error.code]}`);
      continue;
    }

    printWhatHappened(state, result.value, command.value.action);
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