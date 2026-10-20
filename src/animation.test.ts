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
  it('gives the cat distinct sitting, grooming, sleeping and stretching periods', () => {
    const samples = [
      [0, 0], [0.25, 1], [0.5, 2], [0.75, 3],
      [18, 4], [20.99, 4], [21, 5], [22, 6], [23, 5], [24, 6],
      [25, 7], [29.99, 7], [30, 8], [31.99, 8],
    ];
    for (const [seconds, frame] of samples) {
      expect(catPose(seconds, 640).frame).toBe(frame);
      expect(catPose(seconds + 32, 640).frame).toBe(frame);
    }
    expect(catPose(32, 640).direction).toBe(-1);
    expect(catPose(33, 640).x).toBeLessThan(catPose(32, 640).x);
  });
  it('keeps the cat in place while resting and continuous through posture changes', () => {
    for (const width of [140, 185, 640, 1280]) {
      for (const seconds of [18, 21, 25, 30, 32, 50, 53, 57, 62, 64]) {
        expect(Math.abs(catPose(seconds, width).x - catPose(seconds - 0.001, width).x)).toBeLessThanOrEqual(1);
      }
      for (let seconds = 18; seconds < 32; seconds += 0.25) {
        expect(catPose(seconds, width).x).toBe(Math.round(width * 0.53));
        expect(catPose(seconds + 32, width).x).toBe(Math.round(width * 0.3));
      }
    }
  });
  it('repeats every 64 seconds without taking the cat outside mobile roof bounds', () => {
    for (const width of [140, 185, 640, 1280]) {
      for (let seconds = 0; seconds < 64; seconds += 0.25) {
        const pose = catPose(seconds, width);
        expect(catPose(seconds + 64, width)).toEqual(pose);
        expect(pose.x - 12).toBeGreaterThanOrEqual(0);
        expect(pose.x + 14).toBeLessThan(width);
        expect(pose.frame).toBeGreaterThanOrEqual(0);
        expect(pose.frame).toBeLessThanOrEqual(8);
      }
    }
    expect(catPose(-1, 640)).toEqual(catPose(63, 640));
  });
});
