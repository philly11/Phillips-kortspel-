/**
 * Helpers for TESTS ONLY. Game code must never import this file.
 *
 * These throw on bad input instead of returning a Result. That breaks the
 * engine's "no throwing" rule on purpose: in a test, a typo like cards('3x')
 * should fail loudly and immediately, not be handled gracefully.
 */
import { type Card, parseCard, parseCards } from './card';

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