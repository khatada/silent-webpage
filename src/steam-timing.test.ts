import { describe, expect, it } from 'vitest';
import { steamState } from './steam-timing';

describe('cup steam timing', () => {
  it('holds each generated phase for three quarters of a second', () => {
    expect([0, 0.749, 0.75, 1.499, 1.5, 2.249, 2.25, 2.999, 3, 3.749, 3.75, 4.499, 4.5]
      .map(seconds => steamState(seconds).frame)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0]);
  });
  it('fades the loop join to zero with bounded faint opacity', () => {
    expect(steamState(0).alpha).toBe(0);
    expect(steamState(0.1875).alpha).toBeCloseTo(0.2);
    expect(steamState(0.375).alpha).toBe(0.4);
    expect(steamState(4.125).alpha).toBe(0.4);
    expect(steamState(4.3125).alpha).toBeCloseTo(0.2);
    expect(steamState(4.5 - 0.00001).alpha).toBeCloseTo(0.4 * 0.00001 / 0.375, 10);
  });
  it('is independent of update count and preserves a frozen scene clock', () => {
    const frozen = steamState(2.625);
    for (let update = 0; update < 50; update++) expect(steamState(2.625)).toEqual(frozen);
    for (const seconds of [-4.5, -0.25, 0, 0.375, 1.125, 2.625, 4.125]) {
      expect(steamState(seconds + 45)).toEqual(steamState(seconds));
    }
  });
});
