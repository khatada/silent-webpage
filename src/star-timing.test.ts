import { describe, expect, it } from 'vitest';
import { maximumStarDarkness, starCycle, starDarkness } from './star-timing';
import { starScenes } from './image-stars';

describe('irregular star twinkle timing', () => {
  it('gives each star and event independent intervals, peak timing and depth', () => {
    for (let composition = 0; composition < 3; composition++) {
      const first = starScenes[composition].map((_, index) => starCycle(index, composition));
      expect(new Set(first.map(cycle => cycle.phase)).size).toBe(first.length);
      for (let index = 0; index < first.length; index++) {
        const cycles = Array.from({ length: 20 }, (_, event) => starCycle(index, composition, event));
        for (const key of ['period', 'peak', 'maximum'] as const) expect(new Set(cycles.map(cycle => cycle[key])).size).toBe(cycles.length);
        for (const { period, phase, peak, maximum } of cycles) {
          expect(period).toBeGreaterThanOrEqual(3);
          expect(period).toBeLessThanOrEqual(7);
          expect(maximum).toBeGreaterThanOrEqual(0.32);
          expect(maximum).toBeLessThanOrEqual(maximumStarDarkness);
          expect(starDarkness(-phase, index, composition)).toBeCloseTo(0);
          expect(starDarkness(peak - phase, index, composition)).toBeCloseTo(maximum);
          expect(starDarkness(period - phase, index, composition)).toBeCloseTo(0);
          for (const time of [-phase, peak - phase, period - phase]) {
            expect(Math.abs(starDarkness(time + 0.0001, index, composition)
              - starDarkness(time - 0.0001, index, composition))).toBeLessThan(0.000001);
          }
        }
      }
    }
  });
  it('visibly changes each core within a short look while retaining most of its light', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < starScenes[composition].length; index++) {
      const samples = Array.from({ length: 101 }, (_, step) => starDarkness(step * 0.05, index, composition));
      expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.22);
      expect(Math.max(...samples)).toBeLessThanOrEqual(0.45);
      expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    }
  });
  it('reproduces time independently of call order, including negative and very long sessions', () => {
    for (const time of [-100, -1, 0, 3, 60, 1e9, 1e12]) {
      const darkness = starDarkness(time, 3, 1);
      expect(darkness).toBeGreaterThanOrEqual(0);
      expect(darkness).toBeLessThanOrEqual(maximumStarDarkness);
      starDarkness(time + 123, 3, 1);
      expect(starDarkness(time, 3, 1)).toBe(darkness);
    }
    const samples = (index: number, composition: number) => Array.from({ length: 60 }, (_, i) => starDarkness(i * 0.25, index, composition));
    expect(samples(0, 0)).not.toEqual(samples(1, 0));
    expect(samples(0, 0)).not.toEqual(samples(0, 1));
  });
});
