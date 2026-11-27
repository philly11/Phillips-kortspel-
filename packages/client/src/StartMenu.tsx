import { useState } from 'react';
import type { Room } from '@colyseus/sdk';
import type { JoinOptions } from '@kortspel/server/protocol';
import { MAX_NAME_LENGTH } from '@kortspel/server/protocol';
import { gameServer } from './connection';
import { theme } from './theme';
import { buttonStyle, inputStyle, panelStyle, screenStyle } from './ui';

interface StartMenuProps {
  /** Called when we're inside an online room (created or joined). */
  onJoined: (room: Room) => void;
  /** Called when the player picks "Play locally" (hot-seat). */
  onPlayLocally: () => void;
}

/** The first screen: your name, then create a room, join one with a code, or play locally. */
export function StartMenu({ onJoined, onPlayLocally }: StartMenuProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: JoinOptions = { name };

  /**
   * Connecting takes time (the server is far away, in internet terms), so these are
   * `async`: we `await` the server's answer, and show an error if something goes wrong.
   */
  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      onJoined(await gameServer.create('tienlen', options));
    } catch {
      setError('Could not reach the game server. Is it running?');
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === '') {
      setError('Type the code your friend gave you.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onJoined(await gameServer.joinById(cleanCode, options));
    } catch {
      setError(`Could not join room ${cleanCode}. Check the code, or the room may be full.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={screenStyle}>
      <h1 style={{ margin: 0, fontSize: 64 }}>Tiến Lên</h1>

      <section style={panelStyle}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 18 }}>
          Your name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. Phillip"
            style={inputStyle}
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={createRoom}
          style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}
        >
          Create room
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1, display: 'flex' }}>
            <span style={{ position: 'absolute', left: -9999 }}>Room code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void joinRoom();
              }}
              maxLength={4}
              placeholder="CODE"
              style={{ ...inputStyle, width: '100%', letterSpacing: '0.2em', textAlign: 'center' }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={joinRoom}
            style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}
          >
            Join
          </button>
        </div>

        <p role="alert" style={{ margin: 0, minHeight: '1.5em', color: theme.colors.errorText }}>
          {busy ? <span style={{ color: theme.colors.infoText }}>Connecting…</span> : error}
        </p>
      </section>

      <button
        type="button"
        onClick={onPlayLocally}
        style={{ ...buttonStyle('transparent', theme.colors.tableText), border: `3px solid ${theme.colors.tableText}`, boxShadow: 'none' }}
      >
        Play locally (one screen)
      </button>
    </main>
  );
}