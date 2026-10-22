import { describe, expect, it } from 'vitest';
import { streetCarTiming } from './street-car-timing';

describe('street car timing', () => {
  it('starts a quarter through travel and repeats on shared scene time', () => {
    expect(streetCarTiming(0).progress).toBe(0.25);
    expect(streetCarTiming(60)).toEqual(streetCarTiming(0));
    expect(streetCarTiming(-5)).toMatchObject({ progress: 0, distance: 0, visible: true, alpha: 1 });
  });
  it('finishes invisibly and leaves a forty second gap', () => {
    expect(streetCarTiming(15)).toMatchObject({ visible: false, alpha: 0, distance: 1 });
    expect(streetCarTiming(54.999).visible).toBe(false);
    expect(streetCarTiming(55).visible).toBe(true);
  });
  it('recedes monotonically, slows in the distance, and fades only at the end', () => {
    const samples = [0, 5, 10, 15, 19].map(t => streetCarTiming(t - 5));
    expect(samples.map(s => s.distance)).toEqual([...samples.map(s => s.distance)].sort((a, b) => a - b));
    expect(samples[1].distance - samples[0].distance).toBeGreaterThan(samples[3].distance - samples[2].distance);
    expect(samples[3].alpha).toBe(1);
    expect(samples[4].alpha).toBeCloseTo(1 / 3);
  });
});
