import type { CSSProperties } from 'react';
import type { PlayerId, PlayerView } from '@kortspel/engine';
import { CardBack } from './CardBack';
import { PlayingCard } from './PlayingCard';
import { theme } from './theme';

interface SeatProps {
  /** Which player sits here. */
  seat: PlayerId;
  /** What the viewing player is allowed to know. Never the full GameState. */
  view: PlayerView;
}

/** An opponent's place at the table: name, face-down cards, and status. */
export function Seat({ seat, view }: SeatProps) {
  const count = view.cardCounts[seat];
  const place = view.finished.indexOf(seat); // -1 if still playing
  const hasPassed = view.passed[seat];
  const revealed = view.revealed[seat];
  const overlap = theme.card.opponentWidth * theme.card.opponentOverlap;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        // A passed player fades out until the trick ends.
        opacity: hasPassed ? theme.seat.passedOpacity : 1,
        transition: `opacity ${theme.motion.selectMs}ms ease-out`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: theme.font.weight }}>Player {seat + 1}</span>
        {place >= 0 ? (
          <span style={badgeStyle}>Out · {ordinal(place + 1)}</span>
        ) : (
          <span style={badgeStyle}>{count} cards</span>
        )}
        {hasPassed && <span style={badgeStyle}>Passed</span>}
      </div>

      {/* One face-down card per card in their hand, tightly overlapped. */}
      <div style={{ display: 'flex', minHeight: theme.card.opponentWidth * theme.card.aspect }}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
            <CardBack width={theme.card.opponentWidth} />
          </div>
        ))}
      </div>

      {/* The taunt: cards this player chose to show to the table. */}
      {revealed.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: theme.colors.tableTextMuted, fontSize: 14 }}>showing</span>
          {revealed.map((card) => (
            <PlayingCard key={card} card={card} width={theme.card.revealedWidth} />
          ))}
        </div>
      )}
    </div>
  );
}

const badgeStyle: CSSProperties = {
  padding: '2px 10px',
  borderRadius: 999,
  background: theme.colors.badge,
  color: theme.colors.badgeText,
  fontSize: 14,
  fontWeight: 600,
};

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th". */
function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}