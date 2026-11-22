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


describe('detectCombo: straight', () => {
  it('three cards in a row are a straight; suits can be mixed', () => {
    expect(detectCombo(cards('3♠ 4♦ 5♣'))).toEqual(
      ok({ type: 'straight', cards: cards('3♠ 4♦ 5♣'), top: card('5♣') }),
    );
  });

  it('the order you pick the cards in does not matter', () => {
    expect(detectCombo(cards('5♣ 3♠ 4♦'))).toEqual(
      ok({ type: 'straight', cards: cards('3♠ 4♦ 5♣'), top: card('5♣') }),
    );
  });

  it('Q-K-A is a straight (ace is allowed at the top)', () => {
    expect(detectCombo(cards('Q♦ K♠ A♣'))).toEqual(
      ok({ type: 'straight', cards: cards('Q♦ K♠ A♣'), top: card('A♣') }),
    );
  });

  it('the longest straight is 3 up to A (12 cards)', () => {
    const all = cards('3♠ 4♠ 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ J♠ Q♠ K♠ A♥');
    expect(detectCombo(all)).toEqual(ok({ type: 'straight', cards: all, top: card('A♥') }));
  });

  it('a straight can never contain a 2', () => {
    expect(detectCombo(cards('K♠ A♦ 2♥'))).toEqual(err({ code: 'NOT_A_COMBO' }));
    expect(detectCombo(cards('A♠ 2♦ 3♣'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });

  it('two cards in a row are too short to be a straight', () => {
    expect(detectCombo(cards('3♠ 4♠'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });

  it('a gap in the ranks is not a straight', () => {
    expect(detectCombo(cards('3♠ 4♠ 6♠'))).toEqual(err({ code: 'NOT_A_COMBO' }));
  });

  it('a repeated rank is not a straight', () => {
    expect(detectCombo(cards('3♠ 3♦ 4♠ 5♠'))).toEqual(err({ code: 'NOT_A_COMBO' }));
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