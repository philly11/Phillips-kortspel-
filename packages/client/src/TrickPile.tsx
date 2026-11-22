import { motion } from 'motion/react';
import { type Combo, type PlayerId, PLAYER_COUNT } from '@kortspel/engine';
import { PlayingCard } from './PlayingCard';
import { theme } from './theme';

interface TrickPileProps {
  /** The combo on the table. */
  combo: Combo;
  /** Who played it: the cards fly in from their side of the table. */
  playedBy: PlayerId;
  /** Who is looking (sits at the bottom of the screen). */
  me: PlayerId;
}

/**
 * Where a card starts its flight, relative to the middle of the table.
 * Seats are counted from "me" at the bottom: 0 = me, 1 = right, 2 = top, 3 = left.
 */
function flyFrom(playedBy: PlayerId, me: PlayerId): { x: number; y: number } {
  const d = theme.motion.flyDistance;
  const relativeSeat = (playedBy - me + PLAYER_COUNT) % PLAYER_COUNT;
  const directions = [
    { x: 0, y: d }, // from me (below)
    { x: d, y: 0 }, // from the right
    { x: 0, y: -d }, // from across the table (above)
    { x: -d, y: 0 }, // from the left
  ];
  return directions[relativeSeat];
}

/** The combo on the table. Each new combo flies in from its player's seat and lands with a bounce. */
export function TrickPile({ combo, playedBy, me }: TrickPileProps) {
  const from = flyFrom(playedBy, me);
  return (
    // Tilted the same way as the table, so the cards lie flat on the felt.
    <div
      style={{
        display: 'flex',
        gap: 8,
        transform: `perspective(${theme.table.perspective}px) rotateX(${theme.table.tilt}deg)`,
      }}
    >
      {combo.cards.map((card, index) => (
        <motion.div
          key={card}
          // Where the card starts when it first appears...
          initial={{ x: from.x, y: from.y, scale: theme.motion.flyScale, opacity: 0 }}
          // ...where it ends up...
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          // ...and how it gets there: a springy landing, cards one after another.
          transition={{ type: 'spring', ...theme.motion.landSpring, delay: index * theme.motion.flyStagger }}
        >
          <PlayingCard card={card} width={theme.card.tableWidth} />
        </motion.div>
      ))}
    </div>
  );
}