/**
 * Remembers how to get back into an online room if this tab is refreshed.
 *
 * Uses sessionStorage: it belongs to ONE browser tab and is forgotten when the tab
 * closes. (localStorage would be shared by all tabs, so four test tabs would all
 * try to come back as the same player.) Everything browser-specific stays in this
 * small file, so an Electron build can swap it out later.
 */
const KEY = 'tienlen.reconnectionToken';

export function saveReconnectToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // Storage can be blocked (e.g. some private modes). Then we just can't reconnect after a refresh.
  }
}

export function loadReconnectToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetReconnectToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget if storage is blocked.
  }
}