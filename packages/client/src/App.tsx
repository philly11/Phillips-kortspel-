import { type CSSProperties, useEffect, useState } from 'react';
import { useAnimate } from 'motion/react';
import {
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  PLAYER_COUNT,
  applyAction,
  cardToString,
  createGame,
  hideCards,
  isGameOver,
  revealCards,
  view,
} from '@kortspel/engine';
import { ChopBurst } from './ChopBurst';
import { ERROR_MESSAGES, REVEAL_ERROR_MESSAGES } from './messages';
import { PlayButton } from './PlayButton';
import { PlayingCard } from './PlayingCard';
import { Seat } from './Seat';
import { TrickPile } from './TrickPile';
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

export function App() {
  // The game and the UI's own memory. Each setX call redraws the screen.
  const [state, setState] = useState(() => newGame());
  const [selected, setSelected] = useState<readonly Card[]>([]);
  const [message, setMessage] = useState<Message | null>(null);

  // SLAM shake: `scope` marks the element to shake, `animate` shakes it on demand.
  const [scope, animate] = useAnimate();
  const playKey = state.table === null ? null : `${state.lastPlayedBy}:${state.table.cards.join(',')}`;
  const slammedNow = state.lastPlay?.slammed ?? false;

  // useEffect runs AFTER React has drawn the screen, whenever one of the values in
  // the list at the end changes. Here: every new play. If it was a slam, shake the table.
  useEffect(() => {
    if (!slammedNow || scope.current === null) return;
    const d = theme.motion.shakeDistance;
    animate(
      scope.current,
      { x: [0, -d, d * 0.8, -d * 0.5, d * 0.25, 0] },
      { duration: theme.motion.shakeSeconds, delay: theme.motion.shakeDelay },
    );
  }, [playKey, slammedNow, animate, scope]);

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

  /** The taunt: show the selected cards to the table. It doesn't use up your turn. */
  function showSelected() {
    const result = revealCards(state, state.currentPlayer, selected);
    if (!result.ok) {
      setMessage({ text: REVEAL_ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: `${name(state.currentPlayer)} shows ${show(selected)} to the table!`, kind: 'info' });
    setState(result.value);
    setSelected([]);
  }

  /** Turn your revealed cards face-down again. */
  function hideAll() {
    const result = hideCards(state, state.currentPlayer);
    if (!result.ok) {
      setMessage({ text: REVEAL_ERROR_MESSAGES[result.error.code], kind: 'error' });
      return;
    }
    setMessage({ text: `${name(state.currentPlayer)} hides their cards again.`, kind: 'info' });
    setState(result.value);
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
    background: theme.colors.room,
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
      ref={scope}
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
      {/* The table itself: a felt oval with a wooden rim, leaning back in 3D.
          It spans the top two rows of the grid and sits BEHIND everything else. */}
      <div
        aria-hidden="true"
        style={{
          gridRow: '1 / 3',
          gridColumn: '1 / 4',
          alignSelf: 'stretch',
          justifySelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: theme.table.perspective,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '92%',
            height: '96%',
            boxSizing: 'border-box',
            borderRadius: '50%',
            background: theme.colors.felt,
            border: `${theme.table.rimWidth}px solid ${theme.colors.tableRim}`,
            boxShadow: `0 ${theme.table.rimWidth}px 0 ${theme.colors.tableRimShadow}`,
            transform: `rotateX(${theme.table.tilt}deg)`,
          }}
        />
      </div>

      <header style={{ gridArea: 'title', justifySelf: 'start', alignSelf: 'start', zIndex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Tiến Lên</h1>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: theme.colors.tableTextMuted }}>Seed {state.seed}</p>
      </header>

      <div style={{ gridArea: 'top', zIndex: 1 }}>
        <Seat seat={topSeat} view={v} />
      </div>
      <div style={{ gridArea: 'left', zIndex: 1 }}>
        <Seat seat={leftSeat} view={v} />
      </div>
      <div style={{ gridArea: 'right', zIndex: 1 }}>
        <Seat seat={rightSeat} view={v} />
      </div>
      
            {/* CHẶT! stamped over the middle of the table when the last play was a chop.
          It shares the 'center' grid area with the trick, on a higher layer. */}
      {v.lastPlay?.chopped && (
        <div style={{ gridArea: 'center', zIndex: 2 }}>
          <ChopBurst key={playKey} slammed={v.lastPlay.slammed} />
        </div>
      )}
      
      {/* Middle of the table: the combo to beat */}
      <section style={{ gridArea: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {v.table === null ? (
          <p style={{ margin: 0, fontSize: 20, color: theme.colors.tableTextMuted, textAlign: 'center' }}>
            New trick: {name(v.me)} leads
            {v.requiredCard !== null && ` (must include ${cardToString(v.requiredCard)})`}
          </p>
        ) : (
          <>
            {/* The `key` changes with every new play, so React treats it as a brand-new
                pile and Motion plays the fly-in animation again. */}
            <TrickPile
              key={`${v.lastPlayedBy}:${v.table.cards.join(',')}`}
              combo={v.table}
              playedBy={v.lastPlayedBy ?? v.me}
              me={v.me}
              slammed={v.lastPlay?.slammed ?? false}
            />
            <p style={{ margin: 0, color: theme.colors.tableTextMuted }}>
              played by {name(v.lastPlayedBy ?? v.me)}
            </p>
          </>
        )}
      </section>

      {/* Bottom: whose turn, the hand, the buttons, the message */}
      <section style={{ gridArea: 'me', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p
          style={{
            margin: 0,
            padding: '4px 18px',
            borderRadius: 999,
            background: theme.colors.turnPill,
            color: theme.colors.turnPillText,
            fontSize: 20,
            fontWeight: theme.font.weight,
          }}
        >
          {name(v.me)}'s turn
        </p>

        <div
          style={{
            display: 'flex',
            paddingTop: theme.card.selectedLift + 12,
            // Room for the outer cards of the fan, which sit lower than the middle ones.
            paddingBottom: fanDrop(v.hand.length),
          }}
        >
          {v.hand.map((card, index) => {
            const isSelected = selected.includes(card);
            // The fan: cards further from the middle turn more and sit a little lower.
            const fromMiddle = index - (v.hand.length - 1) / 2;
            const angle = fromMiddle * theme.hand.fanAngle;
            const drop = fromMiddle * fromMiddle * theme.hand.fanArc;
            const lift = isSelected ? theme.card.selectedLift : 0;
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
                  transformOrigin: '50% 100%',
                  transform: `translateY(${drop}px) rotate(${angle}deg) translateY(${-lift}px)`,
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
          <PlayButton
            onPlay={(slam) => act({ type: 'play', cards: selected, slam })}
            style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}
          />
          <button
            type="button"
            onClick={() => act({ type: 'pass' })}
            style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}
          >
            Pass
          </button>
          <button type="button" onClick={showSelected} style={tauntButtonStyle}>
            Show
          </button>
          <button type="button" onClick={hideAll} style={tauntButtonStyle}>
            Hide
          </button>
        </div>

        {v.revealed[v.me].length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: theme.colors.tableTextMuted, fontSize: 14 }}>you are showing</span>
            {v.revealed[v.me].map((card) => (
              <PlayingCard key={card} card={card} width={theme.card.revealedWidth} />
            ))}
          </div>
        )}

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

/** How far the outermost card of a fan of `count` cards drops below the middle one. */
function fanDrop(count: number): number {
  const half = (count - 1) / 2;
  return half * half * theme.hand.fanArc;
}

/** The smaller, outlined Show / Hide buttons. */
const tauntButtonStyle: CSSProperties = {
  ...buttonStyle('transparent', theme.colors.tauntButtonText),
  minWidth: 100,
  fontSize: 18,
  border: `3px solid ${theme.colors.tauntButtonBorder}`,
  boxShadow: 'none',
};