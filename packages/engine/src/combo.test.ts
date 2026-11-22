import { describe, it, expect } from 'vitest';
import { detectCombo } from './combo';
import { ok, err } from './result';
import { card, cards } from './test-utils';

describe('detectCombo: single', () => {
  it('any one card is a single, and it is its own top card', () => {
    expect(detectCombo(cards('3♠'))).toEqual(ok({ type: 'single', cards: cards('3♠'), top: card('3♠') }));
    expect(detectCombo(cards('2♥'))).toEqual(ok({ type: 'single', cards: cards('2♥'), top: card('2♥') }));
  });
});

describe('detectCombo: pair', () => {
  it('two cards of the same rank are a pair; the higher suit is the top card', () => {
    expect(detectCombo(cards('7♠ 7♥'))).toEqual(
      ok({ type: 'pair', cards: cards('7♠ 7♥'), top: card('7♥') }),
    );
  });

  it('the order you pick the cards in does not matter', () => {
    expect(detectCombo(cards('7♥ 7♠'))).toEqual(
      ok({ type: 'pair', cards: cards('7♠ 7♥'), top: card('7♥') }),
    );
  });

  it('a pair of 2s is a pair', () => {
    expect(detectCombo(cards('2♣ 2♦'))).toEqual(
      ok({ type: 'pair', cards: cards('2♣ 2♦'), top: card('2♦') }),
    );
  });

  it('two cards of different ranks are not a combo', () => {
    expect(detectCombo(cards('7♠ 8♠'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });
});

describe('detectCombo: triple', () => {
  it('three cards of the same rank are a triple', () => {
    expect(detectCombo(cards('K♦ K♣ K♥'))).toEqual(
      ok({ type: 'triple', cards: cards('K♣ K♦ K♥'), top: card('K♥') }),
    );
  });

  it('three cards where one rank differs are not a combo', () => {
    expect(detectCombo(cards('9♠ 9♣ 10♦'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });
});

describe('detectCombo: bad input', () => {
  it('no cards is an error', () => {
    expect(detectCombo([])).toEqual(err({ code: 'EMPTY' }));
  });

  it('the same card twice is an error', () => {
    expect(detectCombo([card('5♦'), card('5♦')])).toEqual(err({ code: 'DUPLICATE_CARD' }));
  });

  it('numbers outside 0–51 are an error', () => {
    expect(detectCombo([52])).toEqual(err({ code: 'INVALID_CARD' }));
    expect(detectCombo([-1])).toEqual(err({ code: 'INVALID_CARD' }));
  });

  it('unrelated cards are not a combo', () => {
    expect(detectCombo(cards('3♠ 5♦ 9♣ K♥'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });
});