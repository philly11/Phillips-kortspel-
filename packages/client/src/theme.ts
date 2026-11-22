/**
 * Every visual constant for the client lives here: colors, sizes, fonts, timing.
 * Want bigger cards or a different table? Change it here, nowhere else.
 */
export const theme = {
  colors: {
    /** The table surface. */
    felt: '#0E4A38',
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

  motion: {
    /** How long a card takes to pop up or drop back, in ms. (Pillar: under 300 ms.) */
    selectMs: 120,
  },
} as const;