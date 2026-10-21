import { describe, expect, it } from 'vitest';
import { taxiPose } from './taxi-timing';

describe('intermittent distant taxi', () => {
  it('passes monotonically between hidden positions on either side of the alley', () => {
    let previous = -Infinity;
    for (let time = -4; time < 4; time += 0.125) {
      const pose = taxiPose(time, 75, 16);
      expect(pose.visible).toBe(true);
      expect(pose.x).toBeGreaterThanOrEqual(65);
      expect(pose.x).toBeLessThanOrEqual(91);
      expect(pose.x).toBeGreaterThanOrEqual(previous);
      previous = pose.x;
    }
    expect(taxiPose(-4, 75, 16).x + 10).toBe(75);
    expect(taxiPose(4, 75, 16)).toEqual({ x: 91, visible: false });
    expect(taxiPose(0, 75, 16).visible).toBe(true);
  });

  it('leaves the street empty for thirty-seven seconds and repeats without an on-screen jump', () => {
    let empty = 0;
    for (let time = 0; time < 45; time += 0.25) {
      const pose = taxiPose(time, 75, 16);
      if (!pose.visible) empty++;
      expect(taxiPose(time + 45, 75, 16)).toEqual(pose);
    }
    expect(empty * 0.25).toBe(37);
    expect(taxiPose(40.9, 75, 16).visible).toBe(false);
    expect(taxiPose(41, 75, 16)).toEqual({ x: 65, visible: true });
  });
});
