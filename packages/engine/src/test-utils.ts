/**
 * Helpers for TESTS ONLY. Game code must never import this file.
 *
 * These throw on bad input instead of returning a Result. That breaks the
 * engine's "no throwing" rule on purpose: in a test, a typo like cards('3x')
 * should fail loudly and immediately, not be handled gracefully.
 */
import { type Card, parseCard, parseCards } from './card';
import { type Combo, detectCombo } from './combo';
import type { GameState } from './game';

/** One card from text, e.g. card('7♥'). */
export function card(text: string): Card {
  const result = parseCard(text);
  if (!result.ok) {
    throw new Error(`Bad card in test: "${result.error.input}"`);
  }
  return result.value;
}

/** Several cards from space-separated text, e.g. cards('7♠ 7♥'). */
export function cards(text: string): Card[] {
  const result = parseCards(text);
  if (!result.ok) {
    throw new Error(`Bad card in test: "${result.error.input}"`);
  }
  return result.value;
}

/** A combo from space-separated text, e.g. combo('7♠ 7♥'). Throws if it isn't a legal combo. */
export function combo(text: string): Combo {
  const result = detectCombo(cards(text));
  if (!result.ok) {
    throw new Error(`Not a combo in test: "${text}" (${result.error.code})`);
  }
  return result.value;
}

/**
 * Build a GameState by hand, for setting up exact table situations in tests.
 * Only `hands` is required; everything else defaults to "start of a trick, seat 0 to play".
 *
 *   makeState({ hands: ['3♠ 4♠', '5♦', '9♥ 9♣', 'A♠'], table: '4♥', currentPlayer: 2 })
 */
export function makeState(options: {
  hands: string[];
  currentPlayer?: number;
  table?: string | null;
  lastPlayedBy?: number | null;
  passed?: boolean[];
  finished?: number[];
  requiredCard?: string | null;
  revealed?: string[];
}): GameState {
  const table = options.table ?? null;
  const requiredCard = options.requiredCard ?? null;
  return {
    seed: 0,
    hands: options.hands.map(cards),
    currentPlayer: options.currentPlayer ?? 0,
    table: table === null ? null : combo(table),
    lastPlayedBy: options.lastPlayedBy ?? null,
    passed: options.passed ?? options.hands.map(() => false),
    finished: options.finished ?? [],
    requiredCard: requiredCard === null ? null : card(requiredCard),
    revealed: options.revealed?.map(cards) ?? options.hands.map(() => []),
    lastPlay: null,
  };
}