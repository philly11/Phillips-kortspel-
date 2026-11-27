import { useEffect, useRef, useState } from 'react';
import type { Room } from '@colyseus/sdk';
import { type BetAction, type Card, type MatchView, type Payment, type PlayerId, PLAYER_COUNT, cardToString } from '@kortspel/engine';
import type {
  BetRequest,
  EventMessage,
  LobbyMessage,
  PlayRequest,
  RefusedMessage,
  RevealRequest,
} from '@kortspel/server/protocol';
import { BettingBar } from './BettingBar';
import { GameOver } from './GameOver';
import { REFUSED_MESSAGES } from './messages';
import { forgetReconnectToken, saveReconnectToken } from './session';
import { playSound } from './sound';
import { type Message, Table } from './Table';
import { theme } from './theme';
import { buttonStyle, panelStyle, screenStyle } from './ui';

interface OnlineGameProps {
  /** The connection to our room on the server. */
  room: Room;
  /** Go back to the start menu. */
  onLeave: () => void;
}

const show = (cards: readonly Card[]): string => cards.map(cardToString).join(' ');

/** Colyseus' close code for "all reconnection attempts failed". (CloseCode.FAILED_TO_RECONNECT) */
const FAILED_TO_RECONNECT = 4003;

/** Our connection to the room: fine, temporarily lost (retrying), or gone for good. */
type Connection = 'online' | 'reconnecting' | 'lost';

/** The latest thing to tell the player: something that happened, or why their request was refused. */
type Notice =
  | { readonly kind: 'event'; readonly event: EventMessage }
  | { readonly kind: 'refused'; readonly code: RefusedMessage['code'] };

/**
 * Everything that happens inside an online room: the waiting room until four
 * players are seated, then the game. The SERVER decides everything; this screen
 * shows the latest messages and sends the player's requests.
 */
export function OnlineGame({ room, onLeave }: OnlineGameProps) {
  const [lobby, setLobby] = useState<LobbyMessage | null>(null);
  const [view, setView] = useState<MatchView | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [connection, setConnection] = useState<Connection>('online');

  useEffect(() => {
    // Remember how to get back in, in case this tab is refreshed.
    saveReconnectToken(room.reconnectionToken);

    // A dropped connection: the SDK is already retrying by itself; we just show it.
    room.onDrop(() => setConnection('reconnecting'));
    room.onReconnect(() => {
      setConnection('online');
      saveReconnectToken(room.reconnectionToken); // the token changes on every connection
    });
    room.onLeave((code: number) => {
      if (code === FAILED_TO_RECONNECT) {
        forgetReconnectToken();
        setConnection('lost');
      }
    });

    // Start listening, THEN tell the server we're ready, so no message is missed.
    // (In development React runs this twice on purpose; a second listener just sets the same value.)
    room.onMessage('lobby', (incoming: LobbyMessage) => setLobby(incoming));
    room.onMessage('view', (incoming: MatchView) => setView(incoming));
    room.onMessage('event', (incoming: EventMessage) => setNotice({ kind: 'event', event: incoming }));
    room.onMessage('refused', (incoming: RefusedMessage) => setNotice({ kind: 'refused', code: incoming.code }));
    room.send('ready', {});
  }, [room]);

    // ── Chip sounds ──
  // Bets come as events: a check is a knock on the table (like real poker), anything else clinks.
  // A new game clinks too: everyone just paid the ante.
  useEffect(() => {
    if (notice?.kind !== 'event') return;
    const event = notice.event;
    if (event.kind === 'gameStarted') playSound('chip');
    if (event.kind === 'bet') playSound(event.action.type === 'check' ? 'pass' : 'chip');
  }, [notice]);

  // Everything else is spotted by comparing the new view with the previous one.
  const lastView = useRef<MatchView | null>(null);
  useEffect(() => {
    const last = lastView.current; // null for the very first view (the game just started)
    lastView.current = view;
    if (view === null) return;
    const me = view.game.me;

    // Chips moved: the pot to the winner (a cascade), or a trick bonus / chop payment (a clink,
    // a moment after the CHẶT! so you hear both).
    if (last !== null && view.payments.some((payment) => payment.reason === 'win')) {
      playSound('pot');
    } else if (last !== null && view.payments.length > 0) {
      playSound('chip', view.payments.some((payment) => payment.reason === 'chop') ? 0.3 : 0);
    }

    // Your turn to BET (the table already dings for your turn to PLAY).
    const myBetNow = view.phase === 'betting' && view.betting.toAct === me;
    const myBetBefore = last !== null && last.phase === 'betting' && last.betting.toAct === me;
    // Betting just ended and you lead the first trick: also your turn.
    const leadAfterBetting =
      last !== null && last.phase === 'betting' && view.phase === 'playing' && view.game.currentPlayer === me;
    if ((myBetNow && !myBetBefore) || leadAfterBetting) {
      playSound('turn');
    }
  }, [view]);


  /** The name sitting in a seat (or "Player 3" if we don't know it), marked if they're away. */
  const nameOf = (seat: PlayerId): string => {
    const seated = lobby?.players.find((p) => p.seat === seat);
    if (seated === undefined) return `Player ${seat + 1}`;
    return seated.connected ? seated.name : `${seated.name} (away)`;
  };

  /** Turn an event into a line of text with names, e.g. "Anna SLAMS 2♥!". */
  function describeEvent(event: EventMessage): string {
    switch (event.kind) {
      case 'gameStarted':
        return 'New game! Look at your cards and place your bets.';
      case 'bet':
        return describeBet(event.seat, event.action);
      case 'play':
        return event.slam
          ? `${nameOf(event.seat)} SLAMS ${show(event.cards)}!`
          : `${nameOf(event.seat)} played ${show(event.cards)}.`;
      case 'pass':
        return `${nameOf(event.seat)} passed.`;
      case 'reveal':
        return `${nameOf(event.seat)} shows ${show(event.cards)} to the table!`;
      case 'hide':
        return `${nameOf(event.seat)} hides their cards again.`;
    }
  }

  function describeBet(seat: PlayerId, action: BetAction): string {
    switch (action.type) {
      case 'check':
        return `${nameOf(seat)} checks.`;
      case 'call':
        return `${nameOf(seat)} calls.`;
      case 'raise':
        return `${nameOf(seat)} raises by ${action.amount}!`;
    }
  }

  /** Chips that just moved, e.g. "Bao chopped Anna: +10 chips!". */
  function describePayment(payment: Payment): string {
    const to = nameOf(payment.to);
    const from = payment.from === 'pot' ? 'the pot' : nameOf(payment.from);
    switch (payment.reason) {
      case 'chop':
        return `${to} chopped ${from}: +${payment.amount} chips!`;
      case 'trick':
        return `${to} wins the trick: +${payment.amount} from the pot.`;
      case 'win':
        return `${to} wins the game and takes the pot: +${payment.amount}!`;
    }
  }

  // The status line is worked out fresh on every redraw, so it always uses the latest names.
  // After an event, any chips it moved are added to the same line.
  const payments = view?.payments.map(describePayment).join(' ') ?? '';
  const message: Message | null =
    notice === null
      ? null
      : notice.kind === 'refused'
        ? { text: REFUSED_MESSAGES[notice.code], kind: 'error' }
        : { text: `${describeEvent(notice.event)} ${payments}`.trim(), kind: 'info' };

  // ── Requests to the server. We never check legality here: the server answers. ──
  function play(cards: readonly Card[], slam: boolean) {
    const request: PlayRequest = { cards, slam };
    room.send('play', request);
  }
  function bet(action: BetAction) {
    const request: BetRequest = action;
    room.send('bet', request);
  }
  function showCards(cards: readonly Card[]) {
    const request: RevealRequest = { cards };
    room.send('reveal', request);
  }

  function leave() {
    forgetReconnectToken(); // leaving on purpose: don't come back here after a refresh
    void room.leave();
    onLeave();
  }

  // ── Connection lost for good ──────────────────────────────────────────────
  if (connection === 'lost') {
    return (
      <main style={screenStyle}>
        <h1 style={{ margin: 0 }}>Connection lost</h1>
        <p style={{ margin: 0, fontSize: 20 }}>We couldn't get you back into the room.</p>
        <button type="button" onClick={onLeave} style={buttonStyle(theme.colors.playButton, theme.colors.playButtonText)}>
          Back to the menu
        </button>
      </main>
    );
  }

  if (lobby === null) {
    return (
      <main style={screenStyle}>
        <p style={{ fontSize: 22 }}>Joining the room…</p>
      </main>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────
  if (view === null) {
    return (
      <main style={screenStyle}>
        <section style={{ ...panelStyle, alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 18, color: theme.colors.tableTextMuted }}>Share this code with your friends</p>
          <p style={{ margin: 0, fontSize: 72, fontWeight: theme.font.weight, letterSpacing: '0.15em' }}>{lobby.code}</p>

          <ol style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: PLAYER_COUNT }, (_, seat) => {
              const seated = lobby.players.find((p) => p.seat === seat);
              return (
                <li
                  key={seat}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    background: theme.colors.badge,
                    fontSize: 20,
                    color: seated === undefined ? theme.colors.tableTextMuted : theme.colors.tableText,
                  }}
                >
                  {seated?.name ?? 'waiting…'}
                  {seat === lobby.yourSeat && ' (you)'}
                </li>
              );
            })}
          </ol>

          <p style={{ margin: 0, color: theme.colors.tableTextMuted }}>
            {lobby.players.length} / {PLAYER_COUNT} players. The game starts when the table is full.
          </p>
        </section>
        <button type="button" onClick={leave} style={buttonStyle(theme.colors.passButton, theme.colors.passButtonText)}>
          Leave
        </button>
      </main>
    );
  }

  // ── Game over: show places and everyone's chips ─────────────────────────
  const chips = { stacks: view.stacks, pot: view.pot };
  if (view.phase === 'over') {
    return (
      <GameOver
        finished={view.game.finished}
        nameOf={(seat) => `${nameOf(seat)}: ${view.stacks[seat]} chips`}
        onNextGame={() => room.send('nextGame', {})}
      />
    );
  }

  // ── Betting or playing: the same table as hot-seat, but every button sends a request ──
  return (
    <>
      {connection === 'reconnecting' && <ReconnectingBanner />}
      <Table
        view={view.game}
        nameOf={nameOf}
        subtitle={`Room ${lobby.code} · ante ${view.rules.ante} · trick +${view.rules.trickBonus} · chop ${view.rules.chopPayment}`}
        message={message}
        chips={chips}
        controls={
          view.phase === 'betting' ? (
            <BettingBar betting={view.betting} pot={view.pot} me={view.game.me} nameOf={nameOf} onBet={bet} />
          ) : undefined
        }
        onPlay={play}
        onPass={() => room.send('pass', {})}
        onShow={showCards}
        onHide={() => room.send('hide', {})}
      />
    </>
  );
}

/** A bar across the top of the screen while the SDK tries to reconnect. */
function ReconnectingBanner() {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '10px 16px',
        textAlign: 'center',
        background: theme.colors.slamCharge,
        color: theme.colors.slamChargeText,
        fontFamily: theme.font.family,
        fontWeight: theme.font.weight,
        fontSize: 18,
      }}
    >
      Connection lost. Reconnecting…
    </div>
  );
}