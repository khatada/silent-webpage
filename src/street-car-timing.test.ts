import { describe, expect, it } from 'vitest';
import { streetCarInitialOffset, streetCarPeriod, streetCarTiming, streetCarTravel } from './street-car-timing';

describe('street car timing', () => {
  it('starts a quarter through travel and repeats on shared scene time', () => {
    expect(streetCarTiming(0)).toEqual({ progress: 0.25, distance: 0.4375, visible: true, alpha: 1 });
    expect(streetCarTravel / streetCarPeriod).toBe(0.7);
    expect(streetCarTiming(-streetCarInitialOffset)).toEqual({ progress: 0, distance: 0, visible: true, alpha: 1 });
    for (const seconds of [-3.5, 0, 3.5, 8.5, 10.5, 13.5, 16.5]) {
      for (const offset of [-streetCarPeriod, streetCarPeriod, streetCarPeriod * 5]) {
        expect(streetCarTiming(seconds + offset)).toEqual(streetCarTiming(seconds));
      }
    }
  });
  it('finishes invisibly and leaves exactly six seconds before the next pass', () => {
    const end = streetCarTravel - streetCarInitialOffset;
    const next = streetCarPeriod - streetCarInitialOffset;
    expect(end).toBe(10.5);
    expect(next - end).toBe(6);
    expect(streetCarTiming(end - 0.0001).visible).toBe(true);
    expect(streetCarTiming(end - 0.0001).alpha).toBeGreaterThan(0);
    for (const seconds of [end, end + 1, end + 3, next - 0.0001]) {
      expect(streetCarTiming(seconds)).toEqual({ visible: false, alpha: 0, distance: 1, progress: 1 });
    }
    expect(streetCarTiming(next)).toEqual({ visible: true, alpha: 1, distance: 0, progress: 0 });
  });
  it('recedes monotonically, slows in the distance, and fades only at the end', () => {
    const samples = [0, 3.5, 7, 10.5, 13.3].map(t => streetCarTiming(t - streetCarInitialOffset));
    expect(samples.map(s => s.distance)).toEqual([...samples.map(s => s.distance)].sort((a, b) => a - b));
    expect(samples[1].distance - samples[0].distance).toBeGreaterThan(samples[3].distance - samples[2].distance);
    expect(samples[3].alpha).toBe(1);
    expect(samples[4].alpha).toBeCloseTo(1 / 3);
    const fadeStart = streetCarTravel * 0.85 - streetCarInitialOffset;
    expect(streetCarTiming(fadeStart).alpha).toBeCloseTo(1);
    expect(streetCarTiming(fadeStart + streetCarTravel * 0.075).alpha).toBeCloseTo(0.5);
    expect(streetCarTiming(streetCarTravel - streetCarInitialOffset).alpha).toBe(0);
  });
});
