import { describe, expect, it } from 'vitest';
import { fanFrame } from './fan-timing';

describe('generated fan timing', () => {
  it('holds each neighbouring rotor pose for 400ms and wraps at the symmetry seam', () => {
    expect([0, 0.3999, 0.4, 0.7999, 0.8, 1.1999, 1.2, 1.5999, 1.6]
      .map(fanFrame)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0]);
  });
  it('can resume at the same phase without replaying skipped ticks', () => {
    for (const seconds of [-1.6, -0.4, 0, 0.4, 0.8, 1.2, 1.599]) {
      expect(fanFrame(seconds + 1.6 * 100)).toBe(fanFrame(seconds));
    }
    expect(fanFrame(-0.001)).toBe(3);
  });
});
