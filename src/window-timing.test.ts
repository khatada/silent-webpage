import { describe, expect, it } from 'vitest';
import { occupiedWindows, residentPose, windowPhase } from './window-timing';

describe('quiet household activity', () => {
  it('selects no more than one seventh of rooms without reordering the city', () => {
    const rooms = Array.from({ length: 57 }, (_, index) => ({ x: index * 13, y: 290 + index % 3 * 16 }));
    const before = [...rooms];
    for (let length = 0; length <= rooms.length; length++) {
      expect(occupiedWindows(rooms.slice(0, length))).toHaveLength(Math.floor(length / 7));
    }
    expect(occupiedWindows(rooms)).toEqual(occupiedWindows([...rooms].reverse()));
    expect(rooms).toEqual(before);
    expect(new Set(rooms.map(windowPhase)).size).toBeGreaterThan(rooms.length * 0.9);
  });
  it('spreads the selected residents across the cycle instead of selecting early phases', () => {
    const rooms = Array.from({ length: 57 }, (_, index) => ({ x: index * 13, y: 290 + index % 3 * 16 }));
    const phases = occupiedWindows(rooms).map(windowPhase);
    expect(new Set(phases.map((phase) => Math.floor(phase / 10))).size).toBe(3);
    expect(Math.max(...phases) - Math.min(...phases)).toBeGreaterThan(18);
  });
  it('keeps the entire silhouette inside the glass and leaves most of each cycle empty', () => {
    let absent = 0;
    for (let time = 0; time < 30; time += 0.1) {
      const pose = residentPose(time, 0);
      expect(pose.x).toBeGreaterThanOrEqual(1);
      expect(pose.x + 2).toBeLessThanOrEqual(6);
      expect(pose.alpha).toBeGreaterThanOrEqual(0);
      expect(pose.alpha).toBeLessThanOrEqual(1);
      if (pose.alpha === 0) absent++;
      expect(Math.abs(pose.x - residentPose(time + 0.1, 0).x)).toBeLessThanOrEqual(1);
    }
    expect(absent).toBeGreaterThan(150);
    expect(residentPose(12, 0).x).toBe(residentPose(13.9, 0).x);
    expect(residentPose(6.4, 0).alpha).toBeCloseTo(0.5);
    expect(residentPose(19.6, 0).alpha).toBeCloseTo(0.5);
  });
  it('repeats the same pose after a cycle and shifts timing predictably per room', () => {
    for (let time = -5; time < 35; time += 0.25) {
      expect(residentPose(time + 30, 0)).toEqual(residentPose(time, 0));
      expect(residentPose(time, 8)).toEqual(residentPose(time + 8, 0));
    }
  });
});
