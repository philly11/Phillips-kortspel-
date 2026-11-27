import type { CSSProperties } from 'react';
import { theme } from './theme';

/** Shared styles for the menu and online screens. (All values still come from the theme.) */

/** A full-screen page on the "room" background. */
export const screenStyle: CSSProperties = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: 32,
  background: theme.colors.room,
  color: theme.colors.tableText,
  fontFamily: theme.font.family,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
};

/** A chunky pill button in the given colors. */
export function buttonStyle(background: string, color: string): CSSProperties {
  return {
    minWidth: 140,
    minHeight: 52,
    padding: '0 28px',
    border: 'none',
    borderRadius: 999,
    background,
    color,
    fontFamily: theme.font.family,
    fontWeight: theme.font.weight,
    fontSize: 22,
    cursor: 'pointer',
    boxShadow: `0 5px 0 ${theme.colors.buttonShadow}`,
  };
}

/** A big, friendly text field. */
export const inputStyle: CSSProperties = {
  minHeight: 52,
  boxSizing: 'border-box',
  padding: '0 18px',
  borderRadius: 14,
  border: `3px solid ${theme.colors.cardOutline}`,
  background: theme.colors.cardFace,
  color: theme.colors.cardOutline,
  fontFamily: theme.font.family,
  fontWeight: 600,
  fontSize: 22,
};

/** A felt-colored panel, like a small table. */
export const panelStyle: CSSProperties = {
  background: theme.colors.felt,
  border: `${theme.table.rimWidth / 2}px solid ${theme.colors.tableRim}`,
  borderRadius: 28,
  padding: 32,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  minWidth: 360,
  boxShadow: `0 10px 0 ${theme.colors.tableRimShadow}`,
};