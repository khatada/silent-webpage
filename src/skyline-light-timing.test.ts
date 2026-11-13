import { describe, expect, it } from 'vitest';
import { skylineLightCycle, skylineLightDarkness } from './skyline-light-timing';

describe('irregular skyline room lights', () => {
  it('starts mixed and makes independent first changes within three and a half seconds', () => {
    for (let composition = 0; composition < 3; composition++) {
      const delays = Array.from({ length: 6 }, (_, index) => skylineLightCycle(index, composition).delay);
      const initial = Array.from({ length: 6 }, (_, index) => skylineLightDarkness(0, index, composition));
      expect(new Set(delays).size).toBe(6);
      expect(initial.some(level => level === 0)).toBe(true);
      expect(initial.some(level => level >= 0.82)).toBe(true);
      for (let index = 0; index < 6; index++) {
        const { delay, fade, maximum } = skylineLightCycle(index, composition);
        expect(delay).toBeGreaterThanOrEqual(0.5);
        expect(delay).toBeLessThanOrEqual(3.5);
        const before = skylineLightDarkness(delay, index, composition);
        expect(skylineLightDarkness(delay + fade / 2, index, composition)).toBeCloseTo(maximum / 2);
        expect(skylineLightDarkness(delay + fade, index, composition)).toBeCloseTo(maximum - before);
      }
    }
  });
  it('varies successive intervals and holds while keeping smooth off/on transitions', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < 6; index++) {
      const cycles = Array.from({ length: 30 }, (_, event) => skylineLightCycle(index, composition, event));
      expect(new Set(cycles.map(cycle => cycle.period)).size).toBe(30);
      expect(new Set(cycles.map(cycle => cycle.offDuration / cycle.period)).size).toBe(30);
      for (const { delay, period, fade, maximum } of cycles) {
        expect(period).toBeGreaterThanOrEqual(6.5);
        expect(period).toBeLessThanOrEqual(10.5);
        expect(fade).toBeGreaterThanOrEqual(0.45);
        expect(fade).toBeLessThanOrEqual(0.85);
        expect(maximum).toBeGreaterThanOrEqual(0.82);
        expect(maximum).toBeLessThanOrEqual(1);
        expect(period - fade).toBeGreaterThan(5.6);
        for (const time of [delay, delay + fade, delay + period]) {
          expect(Math.abs(skylineLightDarkness(time + 0.0001, index, composition)
            - skylineLightDarkness(time - 0.0001, index, composition))).toBeLessThan(0.000001);
        }
      }
    }
  });
  it('reproduces any timestamp without prior calls and handles very long sessions directly', () => {
    for (const time of [0, 2, 30, 1000, 1e9, 1e12]) {
      const first = skylineLightDarkness(time, 2, 1);
      skylineLightDarkness(time + 17, 2, 1);
      expect(skylineLightDarkness(time, 2, 1)).toBe(first);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThanOrEqual(1);
    }
    const samples = (index: number, composition: number) => Array.from({ length: 200 }, (_, i) => skylineLightDarkness(i * 0.5, index, composition));
    expect(samples(0, 0)).not.toEqual(samples(1, 0));
    expect(samples(0, 0)).not.toEqual(samples(0, 1));
  });
});
