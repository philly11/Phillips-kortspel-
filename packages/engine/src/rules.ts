/**
 * RuleConfig: every rule a room can change. Nothing configurable is hardcoded
 * elsewhere; code reads it from here instead.
 *
 * For now it holds only the chip (betting) settings. Instant wins and penalties
 * will join it later.
 */
export interface RuleConfig {
  /** Chips every player has when they sit down in a room. */
  readonly startingChips: number;
  /** Chips everyone must put into the pot before each game's betting round. */
  readonly ante: number;
  /** Chips a player takes out of the pot each time they win a trick. */
  readonly trickBonus: number;
  /** Chips a chopped player pays straight to the chopper. */
  readonly chopPayment: number;
}

/** The settings a room gets if the creator doesn't change anything. */
export const DEFAULT_RULES: RuleConfig = {
  startingChips: 100,
  ante: 5,
  trickBonus: 2,
  chopPayment: 10,
};