import { motion } from 'motion/react';
import { theme } from './theme';

interface ChopBurstProps {
  /** Was the chop also slammed? Then the stamp is even bigger. */
  slammed: boolean;
}

/**
 * A big "CHẶT!" stamped over the table when someone chops.
 * Give it a new `key` for each play so it stamps again every time.
 */
export function ChopBurst({ slammed }: ChopBurstProps) {
  const m = theme.motion;
  const outline = theme.colors.chopOutline;
  return (
    <motion.div
      aria-hidden="true"
      // Keyframes: each list is a series of values played one after another.
      // `times` says WHEN each value is reached, as a fraction of the duration.
      initial={{ scale: 3, opacity: 0, rotate: m.chopTilt }}
      animate={{
        scale: [3, 0.9, 1.05, 1, 1],
        opacity: [0, 1, 1, 1, 0],
        rotate: m.chopTilt,
      }}
      transition={{ duration: m.chopSeconds, times: [0, 0.12, 0.2, 0.75, 1], ease: 'easeOut' }}
      style={{
        pointerEvents: 'none',
        fontFamily: theme.font.family,
        fontWeight: theme.font.weight,
        fontSize: slammed ? m.chopSlamSize : m.chopSize,
        lineHeight: 1,
        color: theme.colors.chopText,
        // A thick dark outline around the letters (drawn with shadows in 8 directions).
        textShadow: [
          `4px 4px 0 ${outline}`,
          `-4px 4px 0 ${outline}`,
          `4px -4px 0 ${outline}`,
          `-4px -4px 0 ${outline}`,
          `0 6px 0 ${outline}`,
          `0 -4px 0 ${outline}`,
          `6px 0 0 ${outline}`,
          `-4px 0 0 ${outline}`,
        ].join(', '),
        whiteSpace: 'nowrap',
      }}
    >
      CHẶT!
    </motion.div>
  );
}