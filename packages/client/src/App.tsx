import { type CSSProperties, useState } from 'react';
import {
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  PLAYER_COUNT,
  applyAction,
  cardToString,
  createGame,
  isGameOver,
  view,
} from '@kortspel/engine';
import { ERROR_MESSAGES } from './messages';
import { PlayingCard } from './PlayingCard';
import { Seat } from './Seat';
import { theme } from './theme';

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

/** A line of text under the buttons: what just happened, or why a move was refused. */
interface Message {
  text: string;
  kind: 'info' | 'error';
}

/** Describe what an action did, e.g. "Player 2 played 9♠ 9♥." */
function describe(before: GameState, after: GameState, action: Action): string {
  const player = before.currentPlayer;
  const parts = [
    action.type === 'pass' ? `${name(player)} passed.` : `${name(player)} played ${show(action.cards)}.`,
  ];
  if (after.finished.length > before.finished.length) {
    parts.push(`${name(player)} is out of cards!`);
  }
  if (after.table === null && !isGameOver(after)) {
    parts.push(`Everyone passed: ${name(after.currentPlayer)} leads a new trick.`);
  }
  return parts.join(' ');
}

export function App() {
  // The game and the UI's own memory. Each setX call redraws the screen.
  const [state, setState] = useState(() => newGame());
  const [selected, setSelected] = useState<readonly Card[]>([]);
  const [message, setMessage] = useState<Message | null>(null);

  /** Click a card in your hand: select it, or unselect it if it was selected. */
  function toggle(card: Card) {
    setSelected((current) =>
      current.includes(card) ? current.filter((c) => c !== card) : [...current, card],
    );
  }

  /** Send an action to the engine. The ENGINE decides if it's legal; we just show the answer. */
  function act(action: Action) {
    const result = applyAction(state, action);
    if (!result.ok) {
      setMessage({ text: ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: describe(state, result.value, action), kind: 'info' });
    setState(result.value);
    setSelected([]);
  }

  function startNextGame() {
    setState(newGame(state.finished[0]));
    setSelected([]);
    setMessage(null);
  }

  const pageStyle: CSSProperties = {
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
    gap: 24,
  };

  // ── Game over ───────────────────────────────────────────────────────────
  if (isGameOver(state)) {
    const seats = Array.from({ length: PLAYER_COUNT }, (_, seat) => seat);
    const last = seats.filter((seat) => !state.finished.includes(seat));
    const ranking = [...state.finished, ...last];
    return (
      <main style={{ ...pageStyle, justifyContent: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 48 }}>Game over</h1>
        <ol style={{ fontSize: 24, margin: 0 }}>
          {ranking.map((seat) => (
            <li key={seat}>{name(seat)}</li>
          ))}
        </ol>
        <button type="button" onClick={startNextGame} style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}>
          Next game
        </button>
      </main>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────
  const myView = view(state, state.currentPlayer);
  if (!myView.ok) {
    return <p>Something went wrong: {myView.error.code}</p>;
  }
  const v = myView.value;
  const overlap = theme.card.width * theme.card.handOverlap;

  // Seats are placed relative to whoever is at the bottom ("me"):
  // the next player in turn order sits on my right, then across, then on my left.
  const rightSeat = (v.me + 1) % PLAYER_COUNT;
  const topSeat = (v.me + 2) % PLAYER_COUNT;
  const leftSeat = (v.me + 3) % PLAYER_COUNT;

  return (
    <main
      style={{
        ...pageStyle,
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateAreas: `
          "title  top    ."
          "left   center right"
          "me     me     me"
        `,
        alignItems: 'center',
        justifyItems: 'center',
      }}
    >
      <header style={{ gridArea: 'title', justifySelf: 'start', alignSelf: 'start' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Tiến Lên</h1>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: theme.colors.tableTextMuted }}>Seed {state.seed}</p>
      </header>

      <div style={{ gridArea: 'top' }}>
        <Seat seat={topSeat} view={v} />
      </div>
      <div style={{ gridArea: 'left' }}>
        <Seat seat={leftSeat} view={v} />
      </div>
      <div style={{ gridArea: 'right' }}>
        <Seat seat={rightSeat} view={v} />
      </div>

      {/* Middle of the table: the combo to beat */}
      <section style={{ gridArea: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {v.table === null ? (
          <p style={{ margin: 0, fontSize: 20, color: theme.colors.tableTextMuted, textAlign: 'center' }}>
            New trick: {name(v.me)} leads
            {v.requiredCard !== null && ` (must include ${cardToString(v.requiredCard)})`}
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {v.table.cards.map((card) => (
                <PlayingCard key={card} card={card} width={theme.card.tableWidth} />
              ))}
            </div>
            <p style={{ margin: 0, color: theme.colors.tableTextMuted }}>
              played by {name(v.lastPlayedBy ?? v.me)}
            </p>
          </>
        )}
      </section>

      {/* Bottom: whose turn, the hand, the buttons, the message */}
      <section style={{ gridArea: 'me', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 22 }}>{name(v.me)}'s turn</p>

        <div style={{ display: 'flex', paddingTop: theme.card.selectedLift }}>
          {v.hand.map((card, index) => {
            const isSelected = selected.includes(card);
            return (
              <button
                key={card}
                type="button"
                onClick={() => toggle(card)}
                aria-pressed={isSelected}
                style={{
                  // Reset the browser's button look; the card IS the button.
                  all: 'unset',
                  cursor: 'pointer',
                  marginLeft: index === 0 ? 0 : -overlap,
                  borderRadius: theme.card.width * theme.card.cornerRadius,
                  transform: isSelected ? `translateY(-${theme.card.selectedLift}px)` : 'none',
                  boxShadow: isSelected ? `0 0 0 4px ${theme.colors.selectedRing}` : 'none',
                  transition: `transform ${theme.motion.selectMs}ms ease-out`,
                }}
              >
                <PlayingCard card={card} />
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            type="button"
            onClick={() => act({ type: 'play', cards: selected })}
            style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}
          >
            Play
          </button>
          <button
            type="button"
            onClick={() => act({ type: 'pass' })}
            style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}
          >
            Pass
          </button>
        </div>

        <p
          role="status"
          style={{
            margin: 0,
            minHeight: '1.5em',
            textAlign: 'center',
            color: message?.kind === 'error' ? theme.colors.errorText : theme.colors.infoText,
          }}
        >
          {message?.text}
        </p>
      </section>
    </main>
  );
}

/** A chunky pill button in the given colors. */
function buttonStyle(background: string, color: string): CSSProperties {
  return {
    minWidth: 140,
    minHeight: 52,
    padding: '0 28px',
    border: 'none',
    borderRadius: 999,
    background,
    color,
    fontFamily: theme.font.family,
    fontWeight: theme.font.weight,
    fontSize: 22,
    cursor: 'pointer',
    boxShadow: `0 5px 0 ${theme.colors.buttonShadow}`,
  };
}