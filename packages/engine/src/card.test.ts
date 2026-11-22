import { describe, it, expect } from 'vitest';
import {
  RANK,
  SUIT,
  cardToString,
  isValidCard,
  makeCard,
  makeDeck,
  parseCard,
  parseCards,
  rankOf,
  sortCards,
  suitOf,
} from './card';
import { ok, err } from './result';

describe('card encoding', () => {
  it('3♠ is the lowest card (0) and 2♥ is the highest (51)', () => {
    expect(makeCard(RANK.THREE, SUIT.SPADES)).toBe(0);
    expect(makeCard(RANK.TWO, SUIT.HEARTS)).toBe(51);
  });

  it('rankOf and suitOf undo makeCard for every card', () => {
    for (let rank = 0; rank < 13; rank++) {
      for (let suit = 0; suit < 4; suit++) {
        const card = makeCard(rank, suit);
        expect(rankOf(card)).toBe(rank);
        expect(suitOf(card)).toBe(suit);
      }
    }
  });
});

describe('comparing cards', () => {
  it('a higher rank beats a lower rank, whatever the suit', () => {
    const fourOfSpades = makeCard(RANK.FOUR, SUIT.SPADES);
    const threeOfHearts = makeCard(RANK.THREE, SUIT.HEARTS);
    expect(fourOfSpades > threeOfHearts).toBe(true);
  });

  it('with the same rank, suit decides: ♠ < ♣ < ♦ < ♥', () => {
    const spades = makeCard(RANK.SEVEN, SUIT.SPADES);
    const clubs = makeCard(RANK.SEVEN, SUIT.CLUBS);
    const diamonds = makeCard(RANK.SEVEN, SUIT.DIAMONDS);
    const hearts = makeCard(RANK.SEVEN, SUIT.HEARTS);
    expect(spades < clubs).toBe(true);
    expect(clubs < diamonds).toBe(true);
    expect(diamonds < hearts).toBe(true);
  });

  it('2 is the highest rank: 2♠ beats A♥', () => {
    expect(makeCard(RANK.TWO, SUIT.SPADES) > makeCard(RANK.ACE, SUIT.HEARTS)).toBe(true);
  });
});

describe('isValidCard', () => {
  it('accepts 0 to 51', () => {
    expect(isValidCard(0)).toBe(true);
    expect(isValidCard(51)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidCard(-1)).toBe(false);
    expect(isValidCard(52)).toBe(false);
    expect(isValidCard(1.5)).toBe(false);
    expect(isValidCard(Number.NaN)).toBe(false);
  });
});

describe('cardToString', () => {
  it('shows rank then suit', () => {
    expect(cardToString(makeCard(RANK.THREE, SUIT.SPADES))).toBe('3♠');
    expect(cardToString(makeCard(RANK.TEN, SUIT.DIAMONDS))).toBe('10♦');
    expect(cardToString(makeCard(RANK.TWO, SUIT.HEARTS))).toBe('2♥');
  });
});

describe('makeDeck', () => {
  it('has 52 different cards in order', () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(deck).toEqual(sortCards(deck));
  });
});

describe('sortCards', () => {
  it('sorts weakest to strongest', () => {
    const twoOfHearts = makeCard(RANK.TWO, SUIT.HEARTS); // 51
    const tenOfSpades = makeCard(RANK.TEN, SUIT.SPADES); // 28
    const nineOfHearts = makeCard(RANK.NINE, SUIT.HEARTS); // 27
    expect(sortCards([twoOfHearts, tenOfSpades, nineOfHearts])).toEqual([
      nineOfHearts,
      tenOfSpades,
      twoOfHearts,
    ]);
  });

  it('does not change the original array', () => {
    const original = [51, 0, 27];
    sortCards(original);
    expect(original).toEqual([51, 0, 27]);
  });
});

describe('parseCard', () => {
  it('reads suit symbols', () => {
    expect(parseCard('3♠')).toEqual(ok(makeCard(RANK.THREE, SUIT.SPADES)));
    expect(parseCard('10♦')).toEqual(ok(makeCard(RANK.TEN, SUIT.DIAMONDS)));
    expect(parseCard('2♥')).toEqual(ok(makeCard(RANK.TWO, SUIT.HEARTS)));
  });

  it('reads keyboard letters in any case', () => {
    expect(parseCard('3s')).toEqual(ok(makeCard(RANK.THREE, SUIT.SPADES)));
    expect(parseCard('jc')).toEqual(ok(makeCard(RANK.JACK, SUIT.CLUBS)));
    expect(parseCard('Ah')).toEqual(ok(makeCard(RANK.ACE, SUIT.HEARTS)));
    expect(parseCard('10D')).toEqual(ok(makeCard(RANK.TEN, SUIT.DIAMONDS)));
  });

  it('ignores surrounding spaces', () => {
    expect(parseCard('  Q♦ ')).toEqual(ok(makeCard(RANK.QUEEN, SUIT.DIAMONDS)));
  });

  it('can read back every card that cardToString writes', () => {
    for (const card of makeDeck()) {
      expect(parseCard(cardToString(card))).toEqual(ok(card));
    }
  });

  it('returns an error (does not crash) for bad text', () => {
    const badInputs = ['', '1♠', '11♠', '3x', '♠', '10', 'joker'];
    for (const input of badInputs) {
      expect(parseCard(input)).toEqual(err({ code: 'INVALID_CARD', input }));
    }
  });
});

describe('parseCards', () => {
  it('reads a space-separated list', () => {
    expect(parseCards('3♠ 4♠ 5♠')).toEqual(
      ok([
        makeCard(RANK.THREE, SUIT.SPADES),
        makeCard(RANK.FOUR, SUIT.SPADES),
        makeCard(RANK.FIVE, SUIT.SPADES),
      ]),
    );
  });

  it('gives an empty list for empty text', () => {
    expect(parseCards('   ')).toEqual(ok([]));
  });

  it('fails on the first bad card and says which one', () => {
    expect(parseCards('3♠ 4x 5♠')).toEqual(err({ code: 'INVALID_CARD', input: '4x' }));
  });
});