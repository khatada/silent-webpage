import { describe, expect, it } from 'vitest';
import { catPose, travelPosition, windowBrightness } from './animation';

describe('city animation timing', () => {
  it('keeps vehicles continuous within the visible area and wraps beyond its edges', () => {
    expect(travelPosition(1, 640, 116, 10, 80) - travelPosition(0, 640, 116, 10, 80)).toBe(10);
    for (let seconds = 0; seconds < 1000; seconds++) {
      const x = travelPosition(seconds, 185, 116, 10, 20);
      expect(x).toBeGreaterThanOrEqual(-116);
      expect(x).toBeLessThan(185);
    }
    expect(travelPosition(75.6, 640, 116, 10, 80)).toBe(travelPosition(0, 640, 116, 10, 80));
  });
  it('holds window lights steadily between smooth, infrequent transitions', () => {
    expect(windowBrightness(2, 0, 20)).toBe(1);
    expect(windowBrightness(10, 0, 20)).toBe(1);
    expect(windowBrightness(13, 0, 20)).toBe(0);
    expect(windowBrightness(19, 0, 20)).toBe(0);
    expect(windowBrightness(0.45, 0, 20)).toBeCloseTo(0.5);
    expect(windowBrightness(20.45, 0, 20)).toBeCloseTo(0.5);
  });
  it('pauses the cat at both ends, returns smoothly and scales its route on mobile', () => {
    expect(catPose(19, 640)).toEqual(catPose(24, 640));
    expect(catPose(44, 640)).toEqual(catPose(49, 640));
    expect(catPose(26, 640).direction).toBe(-1);
    expect(catPose(26, 640).x).toBeLessThan(catPose(25, 640).x);
    for (const width of [140, 185, 640, 1280]) {
      for (let seconds = 0; seconds < 50; seconds++) {
        const pose = catPose(seconds, width);
        expect(pose.x).toBeGreaterThan(20);
        expect(pose.x).toBeLessThan(width - 20);
        expect(pose.frame).toBeGreaterThanOrEqual(0);
        expect(pose.frame).toBeLessThanOrEqual(4);
      }
    }
  });
});
