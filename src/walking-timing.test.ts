import { describe, expect, it } from 'vitest';
import { walkingFrame, walkingStride } from './walking-timing';

describe('distance-driven eight-pose walking', () => {
  it('follows the measured stance intervals and joins the end to the next cycle', () => {
    const positions = [0, 33, 63, 88, 112, 140, 164, 184];
    expect(positions.map(x => walkingFrame(x, 1, 4))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(walkingFrame(191, 1, 4)).toBe(7);
    expect(walkingFrame(192, 1, 4)).toBe(0);
  });
  it('plays forward in both directions and repeats over multiple strides', () => {
    for (let x = 0; x <= 100; x++) {
      expect(walkingFrame(x, 1, 2)).toBe(walkingFrame(-x, -1, 2));
      expect(walkingFrame(x, 1, 2)).toBe(walkingFrame(x + walkingStride(2), 1, 2));
    }
  });
  it('uses position rather than elapsed time and scales stride with body size', () => {
    expect(walkingFrame(11, 1, 1)).toBe(1);
    for (let x = 0; x < 32; x++) expect(walkingFrame(x, 1, 1)).toBe(walkingFrame(x * 2, 1, 2));
  });
  it('retains every pose on the smallest production pixel grid', () => {
    expect(new Set(Array.from({ length: 24 }, (_, x) => walkingFrame(x, 1, 0.5))).size).toBe(8);
  });
});
