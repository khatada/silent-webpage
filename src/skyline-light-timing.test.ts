import { describe, expect, it } from 'vitest';
import { skylineLightCycle, skylineLightDarkness } from './skyline-light-timing';

describe('irregular skyline room lights', () => {
  it('starts lit and makes independent first changes within five seconds', () => {
    for (let composition = 0; composition < 3; composition++) {
      const delays = Array.from({ length: 6 }, (_, index) => skylineLightCycle(index, composition).delay);
      expect(new Set(delays).size).toBe(6);
      for (let index = 0; index < 6; index++) {
        const { delay, fade } = skylineLightCycle(index, composition);
        expect(delay).toBeGreaterThanOrEqual(1);
        expect(delay).toBeLessThanOrEqual(5);
        expect(skylineLightDarkness(0, index, composition)).toBe(0);
        expect(skylineLightDarkness(delay, index, composition)).toBe(0);
        expect(skylineLightDarkness(delay + fade / 2, index, composition)).toBeCloseTo(0.5);
      }
    }
  });
  it('varies successive intervals and holds while keeping smooth off/on transitions', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < 6; index++) {
      const cycles = Array.from({ length: 30 }, (_, event) => skylineLightCycle(index, composition, event));
      expect(new Set(cycles.map(cycle => cycle.period)).size).toBe(30);
      expect(new Set(cycles.map(cycle => cycle.offDuration / cycle.period)).size).toBe(30);
      for (const { delay, period, fade, offDuration } of cycles) {
        expect(period).toBeGreaterThanOrEqual(14);
        expect(period).toBeLessThanOrEqual(22);
        expect(offDuration - fade).toBeGreaterThan(3);
        expect(period - offDuration - fade).toBeGreaterThan(5);
        expect(skylineLightDarkness(delay + fade, index, composition)).toBeCloseTo(1);
        expect(skylineLightDarkness(delay + offDuration - 0.001, index, composition)).toBe(1);
        expect(skylineLightDarkness(delay + offDuration + fade / 2, index, composition)).toBeCloseTo(0.5);
        expect(skylineLightDarkness(delay + offDuration + fade + 0.001, index, composition)).toBe(0);
        for (const time of [delay, delay + fade, delay + offDuration, delay + offDuration + fade, delay + period]) {
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
