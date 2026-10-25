import { describe, expect, it } from 'vitest';
import { skylineLightCycle, skylineLightDarkness } from './skyline-light-timing';

describe('skyline window light cycles', () => {
  it('starts lit and makes staggered changes promptly, keeping independent slower cycles', () => {
    for (let composition = 0; composition < 3; composition++) {
      const cycles = Array.from({ length: 6 }, (_, index) => skylineLightCycle(index, composition));
      expect(new Set(cycles.map(cycle => cycle.delay)).size).toBe(6);
      expect(new Set(cycles.map(cycle => cycle.period)).size).toBe(6);
      for (let index = 0; index < 6; index++) {
        const cycle = cycles[index];
        expect(cycle.delay).toBeGreaterThanOrEqual(1);
        expect(cycle.delay).toBeLessThanOrEqual(5);
        expect(cycle.period).toBeGreaterThanOrEqual(14);
        expect(cycle.period).toBeLessThanOrEqual(29);
        expect(cycle.fade).toBe(0.7);
        expect(cycle.period * 0.38 - cycle.fade).toBeGreaterThan(4);
        expect(cycle.period * 0.62 - cycle.fade).toBeGreaterThan(7);
        expect(skylineLightDarkness(0, index, composition)).toBe(0);
        expect(skylineLightDarkness(cycle.delay, index, composition)).toBe(0);
        expect(skylineLightDarkness(cycle.delay + cycle.fade / 2, index, composition)).toBeCloseTo(0.5);
      }
    }
  });
  it('holds darkness and returns smoothly to the original light before the cycle repeats', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < 6; index++) {
      const { delay, period, fade } = skylineLightCycle(index, composition);
      const offEnd = delay + period * 0.38;
      expect(skylineLightDarkness(delay + fade, index, composition)).toBe(1);
      expect(skylineLightDarkness(offEnd - 0.001, index, composition)).toBe(1);
      expect(skylineLightDarkness(offEnd + fade / 2, index, composition)).toBeCloseTo(0.5);
      expect(skylineLightDarkness(offEnd + fade, index, composition)).toBeCloseTo(0);
      for (const time of [delay, delay + fade, offEnd, offEnd + fade, delay + period]) {
        expect(Math.abs(skylineLightDarkness(time + 0.0001, index, composition)
          - skylineLightDarkness(time - 0.0001, index, composition))).toBeLessThan(0.000001);
      }
      expect(skylineLightDarkness(delay + fade / 2 + period, index, composition)).toBeCloseTo(0.5);
    }
  });
});
