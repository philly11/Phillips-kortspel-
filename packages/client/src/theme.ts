/**
 * Every visual constant for the client lives here: colors, sizes, fonts, timing.
 * Want bigger cards or a different table? Change it here, nowhere else.
 */
export const theme = {
  colors: {
    /** The room around the table (the "floor"). */
    room: '#2A1D17',
    /** The table surface. */
    felt: '#0E4A38',
    /** The wooden edge around the table. */
    tableRim: '#7A4A26',
    tableRimShadow: 'rgba(0, 0, 0, 0.45)',
    /** Text on the table. */
    tableText: '#FFFFFF',
    tableTextMuted: '#CFE8DD',
    /** The card itself. */
    cardFace: '#FFFBF2',
    cardOutline: '#1C1C22',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    /** Classic two-color deck: ♠ ♣ black, ♦ ♥ red. */
    suitBlack: '#1C1C22',
    suitRed: '#D7263D',
    /** A selected card gets a glowing ring in this color. */
    selectedRing: '#FFC83D',
    /** Buttons. */
    playButton: '#FFC83D',
    playButtonText: '#1C1C22',
    passButton: '#FFFFFF',
    passButtonText: '#1C1C22',
    /** Secondary buttons (Show / Hide). */
    tauntButtonBorder: '#FFFFFF',
    tauntButtonText: '#FFFFFF',
    /** The "Player 3's turn" pill. */
    turnPill: '#FFC83D',
    turnPillText: '#1C1C22',
    buttonShadow: 'rgba(0, 0, 0, 0.35)',
    /** Messages under the buttons. */
    errorText: '#FFB4B4',
    infoText: '#CFE8DD',
    /** The back of a card: a red panel with a light diagonal pattern inside a cream frame. */
    cardBack: '#B8322D',
    cardBackPattern: 'rgba(255, 255, 255, 0.16)',
    /** The little badges on each seat ("5 cards", "Passed", "Out · 1st"). */
    badge: 'rgba(0, 0, 0, 0.28)',
    badgeText: '#FFFFFF',
  },

  font: {
    family: "'Fredoka', system-ui, sans-serif",
    weight: 700,
  },

  card: {
    /** Default card width in px. Every other card measurement scales with it. */
    width: 110,
    /** Width of the cards on the table (the combo to beat). */
    tableWidth: 90,
    /** Height divided by width (a real playing card is about 1.44). */
    aspect: 1.44,
    /** The following are fractions of the card width, so cards look the same at any size. */
    cornerRadius: 0.11,
    outline: 0.033,
    shadowDepth: 0.04,
    cornerRankSize: 0.21,
    cornerSuitSize: 0.145,
    centerSuitSize: 0.53,
    /** How much each card in the hand covers the previous one. */
    handOverlap: 0.4,
    /** How far a selected card pops up, in px. */
    selectedLift: 28,
    /** Opponents' face-down cards. */
    opponentWidth: 36,
    opponentOverlap: 0.62,
    /** Cards an opponent has revealed (the taunt). */
    revealedWidth: 46,
  },

  seat: {
    /** A player who has passed this trick is faded to this opacity. */
    passedOpacity: 0.45,
  },

  table: {
    /** How far the table leans back, in degrees. 0 = seen straight from above. */
    tilt: 24,
    /** Distance of the "camera" in px. Smaller = stronger 3D effect. */
    perspective: 1400,
    /** Thickness of the wooden rim in px. */
    rimWidth: 18,
  },

  hand: {
    /** Each card in the hand is turned this many degrees more than its left neighbour. */
    fanAngle: 2.5,
    /** How much the cards drop towards the ends of the fan, making an arc. */
    fanArc: 0.9,
  },

    motion: {
    /** How long a card takes to pop up or drop back, in ms. (Pillar: under 300 ms.) */
    selectMs: 120,
    /** Played cards fly in from the player's seat, starting this many px away... */
    flyDistance: 240,
    /** ...this much bigger (as if lifted off the table)... */
    flyScale: 1.25,
    /** ...each card a little after the previous one, in seconds... */
    flyStagger: 0.03,
    /** ...and land on a spring: higher stiffness = faster, lower damping = more bounce. */
    landSpring: { stiffness: 600, damping: 22, mass: 0.8 },
  },
} as const;