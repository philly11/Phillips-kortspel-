import { useState } from 'react';
import { type GameState, createGame, view } from '@kortspel/engine';
import { PlayingCard } from './PlayingCard';
import { theme } from './theme';

/** Start a new game with a fresh seed. The seed is picked here, outside the engine. */
function newGame(): GameState {
  const result = createGame({ seed: Date.now() % 1_000_000 });
  if (!result.ok) {
    // Can't happen without a previousWinner, but if it ever does, fail loudly.
    throw new Error(`Could not start a game: ${result.error.code}`);
  }
  return result.value;
}

/** The whole app, for now: the current player's hand on the table. */
export function App() {
  // useState(newGame) runs newGame ONCE, when the component first appears,
  // and remembers the result between re-renders.
  const [state] = useState(newGame);

  const myView = view(state, state.currentPlayer);
  if (!myView.ok) {
    return <p>Something went wrong: {myView.error.code}</p>;
  }
  const v = myView.value;
  const overlap = theme.card.width * theme.card.handOverlap;

  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 32,
        background: theme.colors.felt,
        color: theme.colors.tableText,
        fontFamily: theme.font.family,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 40 }}>Tiến Lên</h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.tableTextMuted }}>
          Seed {state.seed} · Player {v.me + 1}'s turn
        </p>
      </header>

      <div style={{ display: 'flex', paddingBottom: 24 }}>
        {v.hand.map((card, index) => (
          <div key={card} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
            <PlayingCard card={card} />
          </div>
        ))}
      </div>
    </main>
  );
}