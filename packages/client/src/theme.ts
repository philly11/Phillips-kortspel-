/**
 * Every visual constant for the client lives here: colors, sizes, fonts.
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
  },

  font: {
    family: "'Fredoka', system-ui, sans-serif",
    weight: 700,
  },

  card: {
    /** Default card width in px. Every other card measurement scales with it. */
    width: 110,
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
  },
} as const;