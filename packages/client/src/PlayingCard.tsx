import type { ReactNode } from 'react';
import { type Card, RANK_LABELS, SUIT, cardToString, rankOf, suitOf } from '@kortspel/engine';
import { theme } from './theme';

/**
 * The shape of each suit as SVG, in a 24×24 box, indexed by suit number
 * (0 = ♠, 1 = ♣, 2 = ♦, 3 = ♥: the same order as the engine's encoding).
 * `currentColor` means "use the text color of whatever contains me".
 */
const SUIT_SHAPES: readonly ReactNode[] = [
  <path
    key="spade"
    fill="currentColor"
    d="M12 2C9 6 3 9.5 3 14a4.5 4.5 0 0 0 7.6 3.2c-.3 1.6-1 2.9-2.1 3.8h7c-1.1-.9-1.8-2.2-2.1-3.8A4.5 4.5 0 0 0 21 14c0-4.5-6-8-9-12z"
  />,
  <g key="club" fill="currentColor">
    <circle cx="12" cy="6.8" r="4.3" />
    <circle cx="6.8" cy="13.6" r="4.3" />
    <circle cx="17.2" cy="13.6" r="4.3" />
    <path d="M10.4 12.5h3.2l1.9 9.5H8.5z" />
  </g>,
  <path key="diamond" fill="currentColor" d="M12 1.5 21 12 12 22.5 3 12z" />,
  <path
    key="heart"
    fill="currentColor"
    d="M12 21.5s-7.6-4.7-9.7-9.4C.8 8.6 2.9 4.5 6.7 4.5c2.2 0 3.7 1.2 5.3 3.4 1.6-2.2 3.1-3.4 5.3-3.4 3.8 0 5.9 4.1 4.4 7.6-2.1 4.7-9.7 9.4-9.7 9.4z"
  />,
];

/** One suit symbol at `size` px. */
function SuitIcon({ suit, size }: { suit: number; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      {SUIT_SHAPES[suit]}
    </svg>
  );
}

/** ♠ and ♣ are black, ♦ and ♥ are red. */
export function suitColor(card: Card): string {
  const suit = suitOf(card);
  return suit === SUIT.SPADES || suit === SUIT.CLUBS ? theme.colors.suitBlack : theme.colors.suitRed;
}

interface PlayingCardProps {
  card: Card;
  /** Card width in px. Defaults to theme.card.width. */
  width?: number;
}

/** One playing card, face up. */
export function PlayingCard({ card, width = theme.card.width }: PlayingCardProps) {
  const c = theme.card;
  const rank = RANK_LABELS[rankOf(card)];
  const suit = suitOf(card);

  // The rank + small suit that sit in two opposite corners.
  const corner = (flipped: boolean) => (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...(flipped
          ? { right: width * 0.07, bottom: width * 0.06, transform: 'rotate(180deg)' }
          : { left: width * 0.07, top: width * 0.06 }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: width * 0.01,
        fontSize: width * c.cornerRankSize,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      <span>{rank}</span>
      <SuitIcon suit={suit} size={width * c.cornerSuitSize} />
    </div>
  );

  return (
    <div
      role="img"
      aria-label={cardToString(card)}
      style={{
        position: 'relative',
        flex: 'none',
        width,
        height: width * c.aspect,
        boxSizing: 'border-box',
        borderRadius: width * c.cornerRadius,
        border: `${width * c.outline}px solid ${theme.colors.cardOutline}`,
        background: theme.colors.cardFace,
        boxShadow: `0 ${width * c.shadowDepth}px 0 ${theme.colors.cardShadow}`,
        color: suitColor(card),
        fontFamily: theme.font.family,
        fontWeight: theme.font.weight,
        userSelect: 'none',
      }}
    >
      {corner(false)}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SuitIcon suit={suit} size={width * c.centerSuitSize} />
      </div>
      {corner(true)}
    </div>
  );
}