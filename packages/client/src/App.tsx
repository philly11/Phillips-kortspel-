import { useState } from 'react';
import { type GameState, cardToString, createGame, view } from '@kortspel/engine';

/** Start a new game with a fresh seed. The seed is picked here, outside the engine. */
function newGame(): GameState {
  const result = createGame({ seed: Date.now() % 1_000_000 });
  if (!result.ok) {
    // Can't happen without a previousWinner, but if it ever does, fail loudly.
    throw new Error(`Could not start a game: ${result.error.code}`);
  }
  return result.value;
}

/** The whole app, for now: show the current player's hand. */
export function App() {
  // useState(newGame) runs newGame ONCE, when the component first appears,
  // and remembers the result between re-renders.
  const [state] = useState(newGame);

  const myView = view(state, state.currentPlayer);
  if (!myView.ok) {
    return <p>Something went wrong: {myView.error.code}</p>;
  }
  const v = myView.value;

  return (
    <main>
      <h1>Tiến Lên</h1>
      <p>
        Seed {state.seed} · Player {v.me + 1}'s turn
      </p>
      <ul>
        {v.hand.map((card) => (
          <li key={card}>{cardToString(card)}</li>
        ))}
      </ul>
    </main>
  );
}