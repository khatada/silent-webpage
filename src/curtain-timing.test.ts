import { describe, expect, it } from 'vitest';
import { curtainFrame } from './curtain-timing';

describe('curtainFrame', () => {
  it('moves through each neighbouring pose and holds the fixed top at the loop seam', () => {
    expect([0, 3.499, 3.5, 5.499, 5.5, 7.499, 7.5, 9.499, 9.5, 11.999, 12]
      .map(curtainFrame)).toEqual([0, 0, 2, 2, 1, 1, 2, 2, 0, 0, 0]);
  });
  it('repeats without dependence on update count, including negative phases', () => {
    for (const seconds of [-1, 0, 3.5, 6, 8, 11]) {
      expect(curtainFrame(seconds + 12 * 100)).toBe(curtainFrame(seconds));
    }
  });
});
