import { describe, expect, it } from 'vitest';
import { laundryFrame } from './laundry-timing';

describe('laundryFrame', () => {
  it('holds four poses in a quiet return cycle', () => {
    expect([0, 3, 5.5, 8, 10.5, 12, 14].map(seconds => laundryFrame(seconds))).toEqual([0, 1, 2, 3, 2, 0, 0]);
    expect([2.999, 5.499, 7.999, 10.499, 11.999, 13.999].map(seconds => laundryFrame(seconds))).toEqual([0, 1, 2, 3, 2, 0]);
  });
  it('wraps negative time and offsets portrait without changing the cycle', () => {
    for (let seconds = -30; seconds < 30; seconds += 0.25) {
      expect(laundryFrame(seconds + 14)).toBe(laundryFrame(seconds));
      expect(laundryFrame(seconds, 1)).toBe(laundryFrame(seconds + 5));
    }
    expect(laundryFrame(5)).toBe(1);
    expect(laundryFrame(5, 1)).toBe(3);
  });
});
