import { type CSSProperties, useRef, useState } from 'react';
import { theme } from './theme';

interface PlayButtonProps {
  /** Called on release: `slam` is true if the button was held long enough to charge. */
  onPlay: (slam: boolean) => void;
  style: CSSProperties;
}

/**
 * The Play button, with a hidden power move:
 * tap it to play normally, or HOLD it until it fills up and release to SLAM.
 * Works with a mouse, a finger, or the keyboard (hold Space or Enter).
 */
export function PlayButton({ onPlay, style }: PlayButtonProps) {
  // `charging`: the button is being held. `charged`: held long enough to slam.
  const [charging, setCharging] = useState(false);
  const [charged, setCharged] = useState(false);
  // A ref is memory that does NOT redraw the screen when it changes: perfect for a timer.
  const timer = useRef<number | null>(null);

  function startCharging() {
    if (charging) return; // ignore the key repeating while held down
    setCharging(true);
    setCharged(false);
    timer.current = window.setTimeout(() => setCharged(true), theme.motion.slamHoldMs);
  }

  function release() {
    if (!charging) return;
    stopTimer();
    setCharging(false);
    setCharged(false);
    onPlay(charged);
  }

  /** Pointer slid off the button: cancel without playing. */
  function cancel() {
    stopTimer();
    setCharging(false);
    setCharged(false);
  }

  function stopTimer() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  const isPlayKey = (key: string) => key === ' ' || key === 'Enter';

  return (
    <button
      type="button"
      onPointerDown={startCharging}
      onPointerUp={release}
      onPointerLeave={cancel}
      onKeyDown={(event) => {
        if (isPlayKey(event.key)) {
          event.preventDefault(); // stop the browser's own "click on Enter/Space"
          startCharging();
        }
      }}
      onKeyUp={(event) => {
        if (isPlayKey(event.key)) {
          event.preventDefault();
          release();
        }
      }}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        color: charged ? theme.colors.slamChargeText : style.color,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* The charge bar: grows from left to right while you hold the button. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: theme.colors.slamCharge,
          transformOrigin: 'left center',
          transform: `scaleX(${charging ? 1 : 0})`,
          transition: charging ? `transform ${theme.motion.slamHoldMs}ms linear` : 'none',
        }}
      />
      <span style={{ position: 'relative' }}>{charged ? 'SLAM!' : 'Play'}</span>
    </button>
  );
}