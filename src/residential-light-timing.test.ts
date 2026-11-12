import { describe, expect, it } from 'vitest';
import { residentialLightBrightness, residentialLightCycle } from './residential-light-timing';

describe('varied residential room lights', () => {
  it('starts with mixed rooms and changes most of them within eight seconds', () => {
    for (let composition = 0; composition < 3; composition++) {
      const initial = Array.from({ length: 9 }, (_, index) => residentialLightBrightness(0, index, composition));
      expect(initial).toContain(0);
      expect(initial).toContain(1);
      const changed = initial.filter((value, index) => Array.from({ length: 33 }, (_, step) =>
        residentialLightBrightness(step / 4, index, composition)).some(level => Math.abs(level - value) > 0.75));
      expect(changed.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('varies every interval and fade without rapid flashes', () => {
    for (let composition = 0; composition < 3; composition++) for (let index = 0; index < 9; index++) {
      const cycles = Array.from({ length: 30 }, (_, event) => residentialLightCycle(index, composition, event));
      expect(new Set(cycles.map(cycle => cycle.period)).size).toBe(30);
      expect(new Set(cycles.map(cycle => cycle.fade)).size).toBe(30);
      for (const { start, period, fade } of cycles) {
        expect(period).toBeGreaterThanOrEqual(6);
        expect(period).toBeLessThanOrEqual(10);
        expect(fade).toBeGreaterThanOrEqual(0.65);
        expect(fade).toBeLessThanOrEqual(1.15);
        const before = residentialLightBrightness(start - 0.0001, index, composition);
        const at = residentialLightBrightness(start, index, composition);
        expect(Math.abs(at - before)).toBeLessThan(0.000001);
      }
    }
  });

  it('is deterministic for long sessions and does not synchronize different homes', () => {
    for (const time of [0, 2, 30, 1000, 1e9, 1e12]) {
      const first = residentialLightBrightness(time, 4, 2);
      residentialLightBrightness(time + 17, 4, 2);
      expect(residentialLightBrightness(time, 4, 2)).toBe(first);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThanOrEqual(1);
    }
    const samples = (index: number, composition: number) => Array.from({ length: 80 }, (_, step) =>
      residentialLightBrightness(step / 4, index, composition));
    expect(samples(0, 0)).not.toEqual(samples(1, 0));
    expect(samples(0, 0)).not.toEqual(samples(0, 1));
  });
});
