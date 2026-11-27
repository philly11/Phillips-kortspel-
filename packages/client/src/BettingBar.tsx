import { useState } from 'react';
import { type BetAction, type BettingRound, type PlayerId, PLAYER_COUNT, highestBet } from '@kortspel/engine';
import { theme } from './theme';
import { buttonStyle, inputStyle } from './ui';

interface BettingBarProps {
  /** The betting round, straight from the server's view (it's public). */
  betting: BettingRound;
  /** Chips in the pot. */
  pot: number;
  /** Which seat is "me". */
  me: PlayerId;
  nameOf: (seat: PlayerId) => string;
  /** Send a bet. The SERVER decides if it's allowed. */
  onBet: (action: BetAction) => void;
}

/**
 * The betting round: who has bet what, and (on your turn) Check / Call / Raise.
 * It only shows numbers from the view and reports button presses; it never decides
 * whether a bet is legal.
 */
export function BettingBar({ betting, pot, me, nameOf, onBet }: BettingBarProps) {
  const [raiseText, setRaiseText] = useState('10');

  const myTurn = betting.toAct === me;
  const owed = highestBet(betting) - betting.bets[me];
  const myStack = betting.stacks[me];
  // Labels only: "Call 10", or "All-in 7" if you can't cover the whole call.
  const callLabel = owed >= myStack ? `All-in ${myStack}` : `Call ${owed}`;

  function raise(amount: number) {
    onBet({ type: 'raise', amount });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <p
        style={{
          margin: 0,
          padding: '4px 18px',
          borderRadius: 999,
          background: myTurn ? theme.colors.turnPill : theme.colors.badge,
          color: myTurn ? theme.colors.turnPillText : theme.colors.tableText,
          fontSize: 20,
          fontWeight: theme.font.weight,
        }}
      >
        {myTurn
          ? 'Your bet! Look at your cards, then decide.'
          : betting.toAct === null
            ? 'Betting is over.'
            : `Waiting for ${nameOf(betting.toAct)} to bet…`}
      </p>

      {/* Everyone's bet so far this round. */}
      <p style={{ margin: 0, fontSize: 16, color: theme.colors.tableTextMuted, textAlign: 'center' }}>
        Pot {pot} · Bets:{' '}
        {Array.from({ length: PLAYER_COUNT }, (_, seat) => `${nameOf(seat)} ${betting.bets[seat]}`).join(' · ')}
      </p>

      {myTurn && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          {owed === 0 ? (
            <button type="button" onClick={() => onBet({ type: 'check' })} style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}>
              Check
            </button>
          ) : (
            <button type="button" onClick={() => onBet({ type: 'call' })} style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}>
              {callLabel}
            </button>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            Raise by
            <input
              type="number"
              min={1}
              value={raiseText}
              onChange={(event) => setRaiseText(event.target.value)}
              style={{ ...inputStyle, width: 110 }}
            />
          </label>
          <button
            type="button"
            onClick={() => raise(Number(raiseText))}
            style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}
          >
            Raise
          </button>
          {myStack > owed && (
            <button
              type="button"
              onClick={() => raise(myStack - owed)}
              style={buttonStyle(theme.colors.slamCharge, theme.colors.slamChargeText)}
            >
              All-in
            </button>
          )}
        </div>
      )}
    </div>
  );
}