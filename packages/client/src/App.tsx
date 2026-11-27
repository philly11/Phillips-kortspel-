import { useEffect, useRef, useState } from 'react';
import type { Room } from '@colyseus/sdk';
import { gameServer } from './connection';
import { LocalGame } from './LocalGame';
import { OnlineGame } from './OnlineGame';
import { forgetReconnectToken, loadReconnectToken } from './session';
import { StartMenu } from './StartMenu';
import { screenStyle } from './ui';

/** Which screen we're on. Only the online screen needs extra data: the room connection. */
type Screen =
  | { readonly kind: 'menu' }
  | { readonly kind: 'reconnecting' }
  | { readonly kind: 'local' }
  | { readonly kind: 'online'; readonly room: Room };

/** The top of the app: decides which screen to show. */
export function App() {
  // If this tab was in an online game before a refresh, try to get back in first.
  const [screen, setScreen] = useState<Screen>(() =>
    loadReconnectToken() === null ? { kind: 'menu' } : { kind: 'reconnecting' },
  );

  // React runs effects twice in development; this ref makes sure we only try once.
  const triedToReconnect = useRef(false);

  useEffect(() => {
    if (screen.kind !== 'reconnecting' || triedToReconnect.current) return;
    triedToReconnect.current = true;
    const token = loadReconnectToken();
    if (token === null) {
      setScreen({ kind: 'menu' });
      return;
    }
    gameServer.reconnect(token).then(
      (room) => setScreen({ kind: 'online', room }),
      () => {
        // Too late, or the room is gone: start fresh.
        forgetReconnectToken();
        setScreen({ kind: 'menu' });
      },
    );
  }, [screen.kind]);

  switch (screen.kind) {
    case 'menu':
      return (
        <StartMenu
          onJoined={(room) => setScreen({ kind: 'online', room })}
          onPlayLocally={() => setScreen({ kind: 'local' })}
        />
      );
    case 'reconnecting':
      return (
        <main style={screenStyle}>
          <p style={{ fontSize: 22 }}>Getting you back into your game…</p>
        </main>
      );
    case 'local':
      return <LocalGame />;
    case 'online':
      return <OnlineGame room={screen.room} onLeave={() => setScreen({ kind: 'menu' })} />;
  }
}