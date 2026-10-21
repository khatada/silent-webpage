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
        expect(catPose(seconds, width).x).toBe(Math.round(width * 0.75));
        expect(catPose(seconds + 32, width).x).toBe(Math.round(width * 0.25));
      }
    }
  });
  it('moves through six grooming poses and lowers the paw before curled rest on both legs', () => {
    const phases = [[21, 0], [21.25, 1], [21.5, 2], [22.25, 3], [22.5, 4],
      [23, 5], [23.5, 3], [23.75, 1], [24, 0], [24.999, 0]];
    for (const offset of [-64, 0, 32, 64]) {
      phases.forEach(([seconds, phase], index) => {
        expect(catPose(seconds + offset, 640).groomFrame).toBe(phase);
        if (index > 0) expect(catPose(seconds + offset - 0.0001, 640).groomFrame).toBe(phases[index - 1][1]);
      });
      expect(catPose(20.999 + offset, 640)).not.toHaveProperty('groomFrame');
      expect(catPose(25 + offset, 640)).not.toHaveProperty('groomFrame');
    }
    for (let seconds = 0; seconds < 64; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      if (pose.frame !== 5 && pose.frame !== 6) expect(pose).not.toHaveProperty('groomFrame');
    }
  });
  it('settles through six stages between grooming and the held curled pose', () => {
    for (const offset of [-64, 0, 32, 64]) {
      expect(catPose(24.999 + offset, 640)).not.toHaveProperty('settleFrame');
      for (let stage = 0; stage < 6; stage++) {
        const start = 25 + stage * 0.25 + offset;
        const first = catPose(start, 640);
        expect(first.settleFrame).toBe(stage);
        expect(catPose(start + 0.2499, 640).settleFrame).toBe(stage);
        expect(first.frame).toBe(7);
        expect(first.x).toBe(catPose(24.999 + offset, 640).x);
        expect(first).not.toHaveProperty('groomFrame');
      }
      expect(catPose(26.5 + offset, 640)).not.toHaveProperty('settleFrame');
      expect(catPose(26.5 + offset, 640).frame).toBe(7);
    }
    for (let seconds = 0; seconds < 64; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      const leg = seconds % 32;
      if (leg < 25 || leg >= 26.5) expect(pose).not.toHaveProperty('settleFrame');
    }
  });
  it('matches walking speed to body size and stops at the route endpoint', () => {
    for (const [width, scale] of [[390, 2], [640, 1], [1280, 2]]) {
      const duration = width * 0.5 / (32 * scale);
      expect(catPose(1, width, scale).x - catPose(0, width, scale).x).toBe(32 * scale);
      expect(catPose(duration, width, scale).frame).toBe(4);
      expect(catPose(duration + 1, width, scale).x).toBe(catPose(duration, width, scale).x);
      expect(catPose(33, width, scale).x - catPose(32, width, scale).x).toBe(-32 * scale);
    }
    expect(catPose(1, 640, 2).x - catPose(0, 640, 2).x)
      .toBe(2 * (catPose(1, 640, 1).x - catPose(0, 640, 1).x));
    expect(catPose(18, 2560, 1).frame).toBe(4);
    expect(catPose(2, 140, 4).frame).toBe(4);
  });
  it('adds one small breath inside each curled rest, returning to neutral before stretching', () => {
    const samples = [[25, 0], [25.999, 0], [26, 0.5], [27.25, 0.5], [28.499, 0.5], [28.5, 0], [29.999, 0], [30, 0]];
    for (const [seconds, breath] of samples) {
      for (const offset of [-64, -32, 0, 32, 64]) {
        expect(catPose(seconds + offset, 640).breath).toBe(breath);
      }
    }
    for (let seconds = 0; seconds < 64; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      expect([0, 0.5]).toContain(pose.breath);
      if (pose.frame !== 7) expect(pose.breath).toBe(0);
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
