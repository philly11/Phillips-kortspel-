import { useState } from 'react';
import {
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  applyAction,
  cardToString,
  createGame,
  hideCards,
  isGameOver,
  revealCards,
  view,
} from '@kortspel/engine';
import { GameOver } from './GameOver';
import { ERROR_MESSAGES, REVEAL_ERROR_MESSAGES } from './messages';
import { type Message, Table } from './Table';

/**
 * Start a new game with a fresh seed. The seed is picked here, outside the engine.
 * Leave out previousWinner for the very first game (then 3♠ leads).
 */
function newGame(previousWinner?: PlayerId): GameState {
  const result = createGame({ seed: Date.now() % 1_000_000, previousWinner });
  if (!result.ok) {
    // Only possible with an invalid previousWinner, which we never pass.
    throw new Error(`Could not start a game: ${result.error.code}`);
  }
  return result.value;
}

const name = (seat: PlayerId): string => `Player ${seat + 1}`;
const show = (cards: readonly Card[]): string => cards.map(cardToString).join(' ');

/** Describe what an action did, e.g. "Player 2 played 9♠ 9♥." */
function describe(before: GameState, after: GameState, action: Action): string {
  const player = before.currentPlayer;
  const parts = [
    action.type === 'pass'
      ? `${name(player)} passed.`
      : action.slam
        ? `${name(player)} SLAMS ${show(action.cards)}!`
        : `${name(player)} played ${show(action.cards)}.`,
  ];
  if (after.finished.length > before.finished.length) {
    parts.push(`${name(player)} is out of cards!`);
  }
  if (after.table === null && !isGameOver(after)) {
    parts.push(`Everyone passed: ${name(after.currentPlayer)} leads a new trick.`);
  }
  return parts.join(' ');
}

/**
 * Hot-seat: everyone shares one screen. The ENGINE runs right here in the browser;
 * the screen always shows the view of whoever's turn it is.
 */
export function LocalGame() {
  const [state, setState] = useState(() => newGame());
  const [message, setMessage] = useState<Message | null>(null);

  /** Send an action to the engine. The ENGINE decides if it's legal; we just show the answer. */
  function act(action: Action) {
    const result = applyAction(state, action);
    if (!result.ok) {
      setMessage({ text: ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: describe(state, result.value, action), kind: 'info' });
    setState(result.value);
  }

  function showCards(cards: readonly Card[]) {
    const result = revealCards(state, state.currentPlayer, cards);
    if (!result.ok) {
      setMessage({ text: REVEAL_ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: `${name(state.currentPlayer)} shows ${show(cards)} to the table!`, kind: 'info' });
    setState(result.value);
  }

  function hideAll() {
    const result = hideCards(state, state.currentPlayer);
    if (!result.ok) {
      setMessage({ text: REVEAL_ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: `${name(state.currentPlayer)} hides their cards again.`, kind: 'info' });
    setState(result.value);
  }

  if (isGameOver(state)) {
    return (
      <GameOver
        finished={state.finished}
        nameOf={name}
        onNextGame={() => {
          setState(newGame(state.finished[0]));
          setMessage(null);
        }}
      />
    );
  }

  const myView = view(state, state.currentPlayer);
  if (!myView.ok) {
    return <p>Something went wrong: {myView.error.code}</p>;
  }

  return (
    <Table
      view={myView.value}
      nameOf={name}
      subtitle={`Seed ${state.seed}`}
      message={message}
      onPlay={(cards, slam) => act({ type: 'play', cards, slam })}
      onPass={() => act({ type: 'pass' })}
      onShow={showCards}
      onHide={hideAll}
    />
  );
}