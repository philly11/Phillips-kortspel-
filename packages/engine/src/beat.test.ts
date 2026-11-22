import { describe, it, expect } from 'vitest';
import { checkBeat } from './beat';
import { ok, err } from './result';
import { combo } from './test-utils';

describe('checkBeat: singles', () => {
  it('a higher rank beats a lower rank', () => {
    expect(checkBeat(combo('3♥'), combo('4♠'))).toEqual(ok('normal'));
  });

  it('with the same rank, a higher suit beats a lower suit', () => {
    expect(checkBeat(combo('9♠'), combo('9♥'))).toEqual(ok('normal'));
  });

  it('a lower card does not beat a higher card', () => {
    expect(checkBeat(combo('9♥'), combo('9♠'))).toEqual(err({ code: 'TOO_LOW' }));
    expect(checkBeat(combo('K♠'), combo('Q♥'))).toEqual(err({ code: 'TOO_LOW' }));
  });

  it('a 2 beats an ace', () => {
    expect(checkBeat(combo('A♥'), combo('2♠'))).toEqual(ok('normal'));
  });
});

describe('checkBeat: pairs and triples', () => {
  it('a higher pair beats a lower pair', () => {
    expect(checkBeat(combo('7♦ 7♥'), combo('8♠ 8♣'))).toEqual(ok('normal'));
  });

  it('pairs of the same rank are decided by the top card: 7♠7♥ beats 7♣7♦', () => {
    expect(checkBeat(combo('7♣ 7♦'), combo('7♠ 7♥'))).toEqual(ok('normal'));
    expect(checkBeat(combo('7♠ 7♥'), combo('7♣ 7♦'))).toEqual(err({ code: 'TOO_LOW' }));
  });

  it('a higher triple beats a lower triple', () => {
    expect(checkBeat(combo('5♠ 5♣ 5♦'), combo('J♠ J♦ J♥'))).toEqual(ok('normal'));
    expect(checkBeat(combo('J♠ J♦ J♥'), combo('5♠ 5♣ 5♦'))).toEqual(err({ code: 'TOO_LOW' }));
  });
});

describe('checkBeat: straights', () => {
  it('a higher straight of the same length beats a lower one', () => {
    expect(checkBeat(combo('3♠ 4♠ 5♠'), combo('4♦ 5♦ 6♦'))).toEqual(ok('normal'));
  });

  it('straights with the same ranks are decided by the top card suit', () => {
    expect(checkBeat(combo('3♥ 4♥ 5♦'), combo('3♠ 4♠ 5♥'))).toEqual(ok('normal'));
    expect(checkBeat(combo('3♠ 4♠ 5♥'), combo('3♥ 4♥ 5♦'))).toEqual(err({ code: 'TOO_LOW' }));
  });

  it('a straight of a different length cannot beat it, even if higher', () => {
    expect(checkBeat(combo('3♠ 4♠ 5♠'), combo('9♦ 10♦ J♦ Q♦'))).toEqual(err({ code: 'WRONG_LENGTH' }));
    expect(checkBeat(combo('3♠ 4♠ 5♠ 6♠'), combo('J♦ Q♦ K♦'))).toEqual(err({ code: 'WRONG_LENGTH' }));
  });
});

describe('checkBeat: consecutive pairs and four of a kind', () => {
  it('higher consecutive pairs of the same length beat lower ones', () => {
    expect(checkBeat(combo('3♠ 3♣ 4♠ 4♣ 5♠ 5♣'), combo('6♠ 6♣ 7♠ 7♣ 8♠ 8♣'))).toEqual(ok('normal'));
  });

  it('a higher four of a kind beats a lower one', () => {
    expect(checkBeat(combo('6♠ 6♣ 6♦ 6♥'), combo('9♠ 9♣ 9♦ 9♥'))).toEqual(ok('normal'));
    expect(checkBeat(combo('9♠ 9♣ 9♦ 9♥'), combo('6♠ 6♣ 6♦ 6♥'))).toEqual(err({ code: 'TOO_LOW' }));
  });
});

describe('checkBeat: different combo types', () => {
  it('you must answer with the same type of combo', () => {
    expect(checkBeat(combo('5♠'), combo('9♠ 9♣'))).toEqual(err({ code: 'WRONG_TYPE' }));
    expect(checkBeat(combo('5♠ 5♣'), combo('9♠'))).toEqual(err({ code: 'WRONG_TYPE' }));
    expect(checkBeat(combo('3♠ 4♠ 5♠'), combo('9♠ 9♣ 9♦'))).toEqual(err({ code: 'WRONG_TYPE' }));
  });
});


describe('checkBeat: chopping (chặt) with 3 consecutive pairs', () => {
  const threePairs = '3♠ 3♣ 4♠ 4♣ 5♠ 5♣'; // the lowest possible: chopping ignores height

  it('chops a single 2', () => {
    expect(checkBeat(combo('2♥'), combo(threePairs))).toEqual(ok('chop'));
  });

  it('cannot chop a pair of 2s', () => {
    expect(checkBeat(combo('2♦ 2♥'), combo(threePairs))).toEqual(err({ code: 'WRONG_TYPE' }));
  });

  it('cannot chop a single that is not a 2', () => {
    expect(checkBeat(combo('A♥'), combo(threePairs))).toEqual(err({ code: 'WRONG_TYPE' }));
  });
});

describe('checkBeat: chopping (chặt) with four of a kind', () => {
  const four = '6♠ 6♣ 6♦ 6♥';

  it('chops a single 2, a pair of 2s, and 3 consecutive pairs', () => {
    expect(checkBeat(combo('2♥'), combo(four))).toEqual(ok('chop'));
    expect(checkBeat(combo('2♦ 2♥'), combo(four))).toEqual(ok('chop'));
    expect(checkBeat(combo('9♠ 9♣ 10♠ 10♣ J♠ J♣'), combo(four))).toEqual(ok('chop'));
  });

  it('cannot chop a pair that is not 2s', () => {
    expect(checkBeat(combo('A♠ A♥'), combo(four))).toEqual(err({ code: 'WRONG_TYPE' }));
  });

  it('cannot chop a triple of 2s (not on the list)', () => {
    expect(checkBeat(combo('2♣ 2♦ 2♥'), combo(four))).toEqual(err({ code: 'WRONG_TYPE' }));
  });

  it('cannot chop 4 consecutive pairs', () => {
    expect(checkBeat(combo('3♠ 3♣ 4♠ 4♣ 5♠ 5♣ 6♠ 6♣'), combo(four))).toEqual(err({ code: 'WRONG_TYPE' }));
  });
});

describe('checkBeat: chopping (chặt) with 4 or more consecutive pairs', () => {
  const fourPairs = '3♠ 3♣ 4♠ 4♣ 5♠ 5♣ 6♠ 6♣';

  it('chops a single 2, a pair of 2s, 3 consecutive pairs, and four of a kind', () => {
    expect(checkBeat(combo('2♥'), combo(fourPairs))).toEqual(ok('chop'));
    expect(checkBeat(combo('2♦ 2♥'), combo(fourPairs))).toEqual(ok('chop'));
    expect(checkBeat(combo('9♠ 9♣ 10♠ 10♣ J♠ J♣'), combo(fourPairs))).toEqual(ok('chop'));
    expect(checkBeat(combo('K♠ K♣ K♦ K♥'), combo(fourPairs))).toEqual(ok('chop'));
  });

  it('5 consecutive pairs chop too', () => {
    expect(checkBeat(combo('K♠ K♣ K♦ K♥'), combo('3♠ 3♣ 4♠ 4♣ 5♠ 5♣ 6♠ 6♣ 7♠ 7♣'))).toEqual(ok('chop'));
  });

  it('cannot chop a single that is not a 2', () => {
    expect(checkBeat(combo('A♥'), combo(fourPairs))).toEqual(err({ code: 'WRONG_TYPE' }));
  });

  it('against 4 consecutive pairs on the table, the normal rule applies', () => {
    expect(checkBeat(combo(fourPairs), combo('7♠ 7♣ 8♠ 8♣ 9♠ 9♣ 10♠ 10♣'))).toEqual(ok('normal'));
  });
});