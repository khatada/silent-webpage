import { describe, expect, it } from 'vitest';
import { maximumStarDarkness, starCycle, starDarkness } from './star-timing';
import { starScenes } from './image-stars';

describe('star twinkle timing', () => {
  it('distributes periods and phases without fully extinguishing cores', () => {
    for (let composition = 0; composition < 3; composition++) {
      const cycles = Array.from({ length: starScenes[composition].length }, (_, index) => starCycle(index, composition));
      expect(new Set(cycles.map(cycle => cycle.period)).size).toBe(Math.min(15, cycles.length));
      expect(new Set(cycles.map(cycle => `${cycle.period}/${cycle.phase}`)).size).toBe(cycles.length);
      expect(new Set(cycles.map(cycle => cycle.phase / cycle.period)).size).toBe(cycles.length);
      cycles.forEach(({ period, phase }, index) => {
        expect(period).toBeGreaterThanOrEqual(13);
        expect(period).toBeLessThanOrEqual(27);
        expect(starDarkness(-phase, index, composition)).toBe(0);
        expect(starDarkness(period / 2 - phase, index, composition)).toBeCloseTo(maximumStarDarkness);
        expect(maximumStarDarkness).toBeLessThan(1);
      });
    }
  });
  it('is smooth and periodic across bright and dim turnarounds', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < starScenes[composition].length; index++) {
      const { period, phase } = starCycle(index, composition);
      for (const time of [-phase, period / 2 - phase, period - phase]) {
        expect(Math.abs(starDarkness(time + 0.0001, index, composition)
          - starDarkness(time - 0.0001, index, composition))).toBeLessThan(0.000001);
      }
      for (let seconds = -30; seconds < 30; seconds += 0.5) {
        const darkness = starDarkness(seconds, index, composition);
        expect(darkness).toBeGreaterThanOrEqual(0);
        expect(darkness).toBeLessThanOrEqual(maximumStarDarkness);
        expect(starDarkness(seconds + period, index, composition)).toBeCloseTo(darkness);
      }
    }
  });
});
