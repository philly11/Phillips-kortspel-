import { theme } from './theme';

interface CardBackProps {
  /** Card width in px. Defaults to theme.card.width. */
  width?: number;
}

/** The back of a card, for cards you're not allowed to see. Same shape as PlayingCard. */
export function CardBack({ width = theme.card.width }: CardBackProps) {
  const c = theme.card;
  const inset = width * 0.07;
  return (
    <div
      aria-hidden="true"
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
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset,
          borderRadius: width * c.cornerRadius * 0.6,
          backgroundColor: theme.colors.cardBack,
          // Thin diagonal stripes, repeated every few px: a classic card-back pattern.
          backgroundImage: `repeating-linear-gradient(45deg, ${theme.colors.cardBackPattern} 0 ${width * 0.04}px, transparent ${width * 0.04}px ${width * 0.1}px)`,
        }}
      />
    </div>
  );
}