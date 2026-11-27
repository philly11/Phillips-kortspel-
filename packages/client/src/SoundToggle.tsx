import { useState } from 'react';
import { isMuted, setMuted } from './sound';
import { theme } from './theme';

/** A small "Sound on / Sound off" switch for the corner of the table. */
export function SoundToggle() {
  // Start from the remembered setting; after that this button is the only thing changing it.
  const [muted, setMutedState] = useState(isMuted);

  function toggle() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      style={{
        padding: '6px 16px',
        borderRadius: 999,
        border: `2px solid ${theme.colors.tauntButtonBorder}`,
        background: muted ? 'transparent' : theme.colors.badge,
        color: theme.colors.tableText,
        fontFamily: theme.font.family,
        fontWeight: theme.font.weight,
        fontSize: 16,
        cursor: 'pointer',
        opacity: muted ? 0.6 : 1,
      }}
    >
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  );
}