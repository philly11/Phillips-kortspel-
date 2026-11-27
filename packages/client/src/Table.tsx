import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { useAnimate } from 'motion/react';
import { type Card, type PlayerId, type PlayerView, PLAYER_COUNT, cardToString } from '@kortspel/engine';
import { ChopBurst } from './ChopBurst';
import { PlayButton } from './PlayButton';
import { PlayingCard } from './PlayingCard';
import { Seat } from './Seat';
import { TrickPile } from './TrickPile';
import { theme } from './theme';
import { buttonStyle } from './ui';

/** A line of text under the buttons: what just happened, or why a move was refused. */
export interface Message {
  readonly text: string;
  readonly kind: 'info' | 'error';
}

interface TableProps {
  /** Everything the player at the bottom is allowed to see. */
  view: PlayerView;
  /** The name of whoever sits in a seat. */
  nameOf: (seat: PlayerId) => string;
  /** Shown in the top-left corner under the title (the seed, or the room code). */
  subtitle: ReactNode;
  /** The latest message for the status line. */
  message: Message | null;
  /** What to do when a button is pressed. The table never decides if a move is legal. */
  onPlay: (cards: readonly Card[], slam: boolean) => void;
  onPass: () => void;
  onShow: (cards: readonly Card[]) => void;
  onHide: () => void;
  /** Chips at the table (online play). Leave out for a game without chips. */
  chips?: Chips;
  /**
   * Shown instead of the turn line and the Play / Pass buttons, e.g. the betting bar
   * during the betting round. Show / Hide stay available (bluffing is allowed!).
   */
  controls?: ReactNode;
}

/** Everyone's chips and the pot, for showing on the table. */
export interface Chips {
  readonly stacks: readonly number[];
  readonly pot: number;
}

/**
 * The tabletop: seats, the trick, your fanned hand and the buttons.
 * It only SHOWS a view and REPORTS button presses, so it works the same for
 * hot-seat (engine on this computer) and online (engine on the server).
 */
export function Table({ view: v, nameOf, subtitle, message, onPlay, onPass, onShow, onHide, chips, controls }: TableProps) {
  const [selected, setSelected] = useState<readonly Card[]>([]);

  // When the hand changes (a play went through, or it's someone else's hand in hot-seat),
  // forget any selected card that is no longer in it.
  useEffect(() => {
    setSelected((current) => current.filter((card) => v.hand.includes(card)));
  }, [v.hand]);

  // SLAM shake: `scope` marks the element to shake, `animate` shakes it on demand.
  const [scope, animate] = useAnimate();
  const playKey = v.table === null ? null : `${v.lastPlayedBy}:${v.table.cards.join(',')}`;
  const slammedNow = v.lastPlay?.slammed ?? false;

  // After a new play is drawn: if it was a slam, shake the table.
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

  const overlap = theme.card.width * theme.card.handOverlap;
  const isMyTurn = v.currentPlayer === v.me;

  // Seats are placed relative to whoever is at the bottom ("me"):
  // the next player in turn order sits on my right, then across, then on my left.
  const rightSeat = (v.me + 1) % PLAYER_COUNT;
  const topSeat = (v.me + 2) % PLAYER_COUNT;
  const leftSeat = (v.me + 3) % PLAYER_COUNT;

  return (
    <main
      ref={scope}
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 32,
        background: theme.colors.room,
        color: theme.colors.tableText,
        fontFamily: theme.font.family,
        display: 'grid',
        gap: 24,
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
        <p style={{ margin: '2px 0 0', fontSize: 14, color: theme.colors.tableTextMuted }}>{subtitle}</p>
      </header>

      <div style={{ gridArea: 'top', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Seat seat={topSeat} name={nameOf(topSeat)} view={v} />
        {chips !== undefined && <ChipCount amount={chips.stacks[topSeat]} />}
      </div>
      <div style={{ gridArea: 'left', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Seat seat={leftSeat} name={nameOf(leftSeat)} view={v} />
        {chips !== undefined && <ChipCount amount={chips.stacks[leftSeat]} />}
      </div>
      <div style={{ gridArea: 'right', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Seat seat={rightSeat} name={nameOf(rightSeat)} view={v} />
        {chips !== undefined && <ChipCount amount={chips.stacks[rightSeat]} />}
      </div>

      {/* CHẶT! stamped over the middle of the table when the last play was a chop. */}
      {v.lastPlay?.chopped && (
        <div style={{ gridArea: 'center', zIndex: 2 }}>
          <ChopBurst key={playKey} slammed={v.lastPlay.slammed} />
        </div>
      )}

      {/* Middle of the table: the pot, and the combo to beat */}
      <section style={{ gridArea: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {chips !== undefined && <ChipCount amount={chips.pot} label="Pot" big />}
        {v.table === null ? (
          <p style={{ margin: 0, fontSize: 20, color: theme.colors.tableTextMuted, textAlign: 'center' }}>
            New trick: {nameOf(v.currentPlayer)} leads
            {v.requiredCard !== null && ` (must include ${cardToString(v.requiredCard)})`}
          </p>
        ) : (
          <>
            {/* A new key for every play, so the fly-in animation plays again. */}
            <TrickPile
              key={playKey}
              combo={v.table}
              playedBy={v.lastPlayedBy ?? v.me}
              me={v.me}
              slammed={v.lastPlay?.slammed ?? false}
            />
            <p style={{ margin: 0, color: theme.colors.tableTextMuted }}>
              played by {nameOf(v.lastPlayedBy ?? v.me)}
            </p>
          </>
        )}
      </section>

      {/* Bottom: whose turn (or the betting bar), the hand, the buttons, the message */}
      <section style={{ gridArea: 'me', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {controls ?? (
          <p
            style={{
              margin: 0,
              padding: '4px 18px',
              borderRadius: 999,
              background: isMyTurn ? theme.colors.turnPill : theme.colors.badge,
              color: isMyTurn ? theme.colors.turnPillText : theme.colors.tableText,
              fontSize: 20,
              fontWeight: theme.font.weight,
            }}
          >
            {isMyTurn ? `${nameOf(v.me)}: your turn!` : `Waiting for ${nameOf(v.currentPlayer)}…`}
          </p>
        )}

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {chips !== undefined && <ChipCount amount={chips.stacks[v.me]} label="You" />}
          {controls === undefined && (
            <>
              <PlayButton
                onPlay={(slam) => onPlay(selected, slam)}
                style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}
              />
              <button type="button" onClick={onPass} style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}>
                Pass
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              onShow(selected);
              setSelected([]);
            }}
            style={tauntButtonStyle}
          >
            Show
          </button>
          <button type="button" onClick={onHide} style={tauntButtonStyle}>
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

/** How far the outermost card of a fan of `count` cards drops below the middle one. */
function fanDrop(count: number): number {
  const half = (count - 1) / 2;
  return half * half * theme.hand.fanArc;
}

/** A chip count like "● 47", or "Pot ● 52" in the middle of the table. */
function ChipCount({ amount, label, big = false }: { amount: number; label?: string; big?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: big ? '4px 16px' : '2px 12px',
        borderRadius: 999,
        background: theme.colors.badge,
        color: theme.colors.badgeText,
        fontSize: big ? 22 : 16,
        fontWeight: theme.font.weight,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {/* The "chip": a gold dot. */}
      <span aria-hidden="true" style={{ color: theme.colors.playButton }}>
        ●
      </span>
      {amount}
    </span>
  );
}

/** The smaller, outlined Show / Hide buttons. */
const tauntButtonStyle: CSSProperties = {
  ...buttonStyle('transparent', theme.colors.tauntButtonText),
  minWidth: 100,
  fontSize: 18,
  border: `3px solid ${theme.colors.tauntButtonBorder}`,
  boxShadow: 'none',
};