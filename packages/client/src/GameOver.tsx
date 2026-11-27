import type { PlayerId } from '@kortspel/engine';
import { PLAYER_COUNT } from '@kortspel/engine';
import { theme } from './theme';
import { buttonStyle, screenStyle } from './ui';

interface GameOverProps {
  /** Players in finishing order (1st place first). The last player may be missing. */
  finished: readonly PlayerId[];
  nameOf: (seat: PlayerId) => string;
  onNextGame: () => void;
}

/** The results screen: everyone's place, and a button for the next game. */
export function GameOver({ finished, nameOf, onNextGame }: GameOverProps) {
  const seats = Array.from({ length: PLAYER_COUNT }, (_, seat) => seat);
  const ranking = [...finished, ...seats.filter((seat) => !finished.includes(seat))];
  return (
    <main style={screenStyle}>
      <h1 style={{ margin: 0, fontSize: 48 }}>Game over</h1>
      <ol style={{ fontSize: 24, margin: 0 }}>
        {ranking.map((seat) => (
          <li key={seat}>{nameOf(seat)}</li>
        ))}
      </ol>
      <button type="button" onClick={onNextGame} style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}>
        Next game
      </button>
    </main>
  );
}