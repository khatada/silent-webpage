import { describe, expect, it } from 'vitest';
import { catLegDuration, catPeriod, catTurnStart, catPose, travelPosition, windowBrightness } from './animation';
import { generatedLayout } from './generated-layout';

describe('city animation timing', () => {
  it('fits a complete rise and at least three seconds of looking in the newly eligible seated interval', () => {
    for (const offset of [0, catLegDuration]) {
      for (const [time, frame] of [[13.4999, undefined], [13.5, 1], [13.75, 2], [14, 3],
        [14.25, 4], [14.5, 5], [14.75, 6], [16.25, 5], [16.5, 4], [16.75, 3],
        [17, 2], [17.25, 1], [17.5, undefined]] as const) {
        const pose = catPose(time + offset, 832);
        expect(pose.riseFrame).toBe(frame);
        expect(pose.x).toBe(catPose(13 + offset, 832).x);
        expect(pose.lookFrame).toBeUndefined();
      }
      expect(catPose(17.9999 + offset, 832).lookFrame).toBeUndefined();
      expect(catPose(18 + offset, 832).lookFrame).toBe(0);
      expect(catPose(18.75 + offset, 832).lookFrame).toBe(1);
      expect(catPose(20.25 + offset, 832).lookFrame).toBe(0);
      expect(catPose(21 + offset, 832).groomFrame).toBe(0);
      for (let time = 0; time < 21; time += 0.125) {
        expect(catPose(time + offset, 864.0064).riseFrame).toBeUndefined();
      }
    }
    for (const [width, height] of [[1440, 900], [1920, 1080], [800, 600]]) {
      const layout = generatedLayout(width, height);
      const scale = layout.motionScale * layout.composition.actorScale;
      expect(Array.from({ length: 168 }, (_, i) => catPose(i / 8, width, scale))
        .some(pose => pose.riseFrame !== undefined)).toBe(true);
    }
  });
  it('retains every rise transition while shortening only the standing hold on landscape screens', () => {
    const stages = [[0, 0.25, 1], [0.25, 0.5, 2], [0.5, 0.75, 3], [0.75, 1, 4],
      [1, 1.25, 5], [1.25, 2.25, 6], [2.25, 2.5, 5], [2.5, 2.75, 4],
      [2.75, 3, 3], [3, 3.25, 2], [3.25, 3.5, 1]] as const;
    const width = 844, layout = generatedLayout(width, 390);
    const scale = layout.motionScale * layout.composition.actorScale;
    const start = width / (64 * scale) + 0.5;
    for (const offset of [0, catLegDuration]) {
      expect(catPose(start - 0.0001 + offset, width, scale).riseFrame).toBeUndefined();
      for (const [from, to, frame] of stages) {
        for (const time of [start + from + 0.0001, start + to - 0.0001]) {
          const pose = catPose(time + offset, width, scale);
          expect(pose.riseFrame).toBe(frame);
          expect(pose.lookFrame).toBeUndefined();
          expect(pose.x).toBe(catPose(start + offset, width, scale).x);
        }
      }
      expect(catPose(start + 3.5 + offset, width, scale).riseFrame).toBeUndefined();
      expect(catPose(start + 3.9999 + offset, width, scale).lookFrame).toBeUndefined();
      expect(catPose(start + 4 + offset, width, scale).lookFrame).toBe(0);
      expect(catPose(20.9999 + offset, width, scale).lookFrame).toBe(0);
      expect(catPose(21 + offset, width, scale).groomFrame).toBe(0);
      expect(catPose(14 + offset, 864).riseFrame).toBe(1);
      expect(catPose(14 + offset, 864.0064).riseFrame).toBeUndefined();
    }
  });
  it('keeps the pose deterministic while the shared motion clock is paused', () => {
    const paused = catPose(14, 832);
    expect(paused.riseFrame).toBe(3);
    for (let i = 0; i < 20; i++) expect(catPose(14, 832)).toEqual(paused);
    expect(catPose(14.25, 832).riseFrame).toBe(4);
  });
  it('rises and sits through every generated intermediate with a held stand on both legs', () => {
    // A 5s walk leaves exactly enough room: half a second seated, 4s rising, half a second seated.
    const stages = [[0, 0.25, 1], [0.25, 0.5, 2], [0.5, 0.75, 3], [0.75, 1, 4],
      [1, 1.25, 5], [1.25, 2.75, 6], [2.75, 3, 5], [3, 3.25, 4],
      [3.25, 3.5, 3], [3.5, 3.75, 2], [3.75, 4, 1]] as const;
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
      const start = 5.5 + offset;
      expect(catPose(start - 0.0001, 320)).not.toHaveProperty('riseFrame');
      expect(catPose(start, 320).riseFrame).toBe(1);
      for (const [from, to, frame] of stages) {
        for (const time of [start + from + 0.0001, start + to - 0.0001]) {
          const pose = catPose(time, 320);
          expect(pose.riseFrame).toBe(frame);
          expect(pose.frame).toBe(4);
          expect(pose.x).toBe(catPose(5 + offset, 320).x);
          expect(pose.direction).toBe(catPose(5 + offset, 320).direction);
          expect(pose).not.toHaveProperty('lookFrame');
          expect(pose).not.toHaveProperty('groomFrame');
          expect(pose).not.toHaveProperty('settleFrame');
          expect(pose).not.toHaveProperty('stretchFrame');
          expect(pose).not.toHaveProperty('turnFrame');
        }
      }
      expect(catPose(start + 4, 320)).not.toHaveProperty('riseFrame');
      expect(catPose(start + 4.4999, 320)).not.toHaveProperty('lookFrame');
      expect(catPose(start + 4.5, 320).lookFrame).toBe(0);
    }
  });
  it('only adds the rise when the seated interval fits it, preserving the existing route and later actions', () => {
    for (const [width, scale, enabled] of [[320, 1, true], [640, 2, true],
      [320.0064, 1, true], [640, 1, true], [832, 1, true], [864, 1, true], [864.0064, 1, false], [1280, 1, false]] as const) {
      let seen = false;
      for (let time = 0; time < catPeriod; time += 0.125) {
        const pose = catPose(time, width, scale);
        if (pose.riseFrame !== undefined) {
          seen = true;
          expect(pose.frame).toBe(4);
          expect(pose.lookFrame).toBeUndefined();
          expect(time % catLegDuration).toBeLessThan(21);
        }
        expect(catPose(time + catPeriod, width, scale)).toEqual(pose);
      }
      expect(seen).toBe(enabled);
    }
    // Shortest walks retain .5s+ of neutral seating; first frame and every later phase stay unchanged.
    expect(catPose(3.9999, 140, 4)).not.toHaveProperty('riseFrame');
    expect(catPose(4, 140, 4).riseFrame).toBe(1);
    for (const time of [0, 1, 2, 21, 22, 25, 26, 30, 32, 35.9]) {
      expect(catPose(time, 320)).not.toHaveProperty('riseFrame');
    }
  });
  it('looks around once while seated, holding the clear glance between two passing poses', () => {
    // width 640 / scale 1 finishes walking at 10s; the rise precedes a six-second glance.
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
      for (const [time, expected] of [[14.9999, undefined], [15, 0], [16.4999, 0],
        [16.5, 1], [19.4999, 1], [19.5, 0], [20.9999, 0], [21, undefined]] as const) {
        const pose = catPose(time + offset, 640);
        expect(pose.lookFrame).toBe(expected);
        expect(pose.frame).toBe(time === 21 ? 5 : 4);
        expect(pose.x).toBe(catPose(12 + offset, 640).x);
      }
    }
  });
  it('shortens a glance to the seated time available and omits it when a calm pause cannot fit', () => {
    // A 16s walk leaves 5s seated: 3.5s glance plus .75s of stillness on either side.
    expect(catPose(16.7499, 1024).lookFrame).toBeUndefined();
    expect(catPose(16.75, 1024).lookFrame).toBe(0);
    expect(catPose(18.5, 1024).lookFrame).toBe(1);
    expect(catPose(20.25, 1024).lookFrame).toBeUndefined();
    for (let time = 0; time < catPeriod; time += 0.125) {
      expect(catPose(time, 1280).lookFrame).toBeUndefined();
      const pose = catPose(time, 640);
      if (pose.frame !== 4) expect(pose.lookFrame).toBeUndefined();
    }
  });
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
      expect(catPose(seconds + catLegDuration, 640).frame).toBe(frame);
    }
    expect(catPose(catLegDuration, 640).direction).toBe(-1);
    expect(catPose(catLegDuration + 1, 640).x).toBeLessThan(catPose(catLegDuration, 640).x);
  });
  it('keeps the cat in place while resting and continuous through posture changes', () => {
    for (const width of [140, 185, 640, 1280]) {
      for (const seconds of [18, 21, 25, 30, 32, 36, 54, 57, 61, 66, 68, 72]) {
        expect(Math.abs(catPose(seconds, width).x - catPose(seconds - 0.001, width).x)).toBeLessThanOrEqual(1);
      }
      for (let seconds = 18; seconds < catLegDuration; seconds += 0.25) {
        expect(catPose(seconds, width).x).toBe(Math.round(width * 0.75));
        expect(catPose(seconds + catLegDuration, width).x).toBe(Math.round(width * 0.25));
      }
    }
  });
  it('moves through six grooming poses and lowers the paw before curled rest on both legs', () => {
    const phases = [[21, 0], [21.25, 1], [21.5, 2], [22.25, 3], [22.5, 4],
      [23, 5], [23.5, 3], [23.75, 1], [24, 0], [24.999, 0]];
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
      phases.forEach(([seconds, phase], index) => {
        expect(catPose(seconds + offset, 640).groomFrame).toBe(phase);
        if (index > 0) expect(catPose(seconds + offset - 0.0001, 640).groomFrame).toBe(phases[index - 1][1]);
      });
      expect(catPose(20.999 + offset, 640)).not.toHaveProperty('groomFrame');
      expect(catPose(25 + offset, 640)).not.toHaveProperty('groomFrame');
    }
    for (let seconds = 0; seconds < catPeriod; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      if (pose.frame !== 5 && pose.frame !== 6) expect(pose).not.toHaveProperty('groomFrame');
    }
  });
  it('settles through six stages between grooming and the held curled pose', () => {
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
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
    for (let seconds = 0; seconds < catPeriod; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      const leg = seconds % catLegDuration;
      if (leg < 25 || leg >= 26.5) expect(pose).not.toHaveProperty('settleFrame');
    }
  });
  it('uncurls through six stretching stages and holds the exact stretched endpoint on both legs', () => {
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
      expect(catPose(29.999 + offset, 640)).not.toHaveProperty('stretchFrame');
      for (let stage = 0; stage < 6; stage++) {
        const start = 30 + stage * 0.25 + offset;
        for (const time of [start, start + 0.2499]) {
          const pose = catPose(time, 640);
          expect(pose.stretchFrame).toBe(stage);
          expect(pose.frame).toBe(8);
          expect(pose.x).toBe(catPose(29.999 + offset, 640).x);
          expect(pose).not.toHaveProperty('groomFrame');
          expect(pose).not.toHaveProperty('settleFrame');
        }
      }
      expect(catPose(31.5 + offset, 640)).not.toHaveProperty('stretchFrame');
      expect(catPose(31.999 + offset, 640).frame).toBe(8);
      expect(catPose(catLegDuration + offset, 640).frame).toBe(0);
    }
    for (let seconds = 0; seconds < catPeriod; seconds += 0.125) {
      const leg = seconds % catLegDuration;
      if (leg < 30 || leg >= 31.5) expect(catPose(seconds, 640)).not.toHaveProperty('stretchFrame');
    }
  });
  it('recovers and turns on both legs with a fixed root through every boundary', () => {
    const ends = [32.25, 32.75, 33.25, 33.75, 34.25, 34.75, 35.75, catLegDuration];
    for (const offset of [-catPeriod, 0, catLegDuration, catPeriod]) {
      expect(catPose(catTurnStart - 0.001 + offset, 640)).not.toHaveProperty('turnFrame');
      ends.forEach((end, stage) => {
        const start = stage === 0 ? catTurnStart : ends[stage - 1];
        for (const time of [start, end - 0.0001]) {
          const pose = catPose(time + offset, 640);
          expect(pose.turnFrame).toBe(stage);
          expect(pose.frame).toBe(8);
          expect(pose.x).toBe(catPose(catTurnStart + offset, 640).x);
          expect(pose.direction).toBe(catPose(catTurnStart + offset, 640).direction);
        }
      });
      const endpoint = catPose(catLegDuration + offset, 640);
      expect(endpoint).not.toHaveProperty('turnFrame');
      expect(endpoint.frame).toBe(0);
      expect(endpoint.x).toBe(catPose(catLegDuration - 0.0001 + offset, 640).x);
      expect(endpoint.direction).toBe(-catPose(catLegDuration - 0.0001 + offset, 640).direction);
    }
  });
  it('matches walking speed to body size and stops at the route endpoint', () => {
    for (const [width, scale] of [[390, 2], [640, 1], [1280, 2]]) {
      const duration = width * 0.5 / (32 * scale);
      expect(catPose(1, width, scale).x - catPose(0, width, scale).x).toBe(32 * scale);
      expect(catPose(duration, width, scale).frame).toBe(4);
      expect(catPose(duration + 1, width, scale).x).toBe(catPose(duration, width, scale).x);
      expect(catPose(catLegDuration + 1, width, scale).x - catPose(catLegDuration, width, scale).x).toBe(-32 * scale);
    }
    expect(catPose(1, 640, 2).x - catPose(0, 640, 2).x)
      .toBe(2 * (catPose(1, 640, 1).x - catPose(0, 640, 1).x));
    expect(catPose(18, 2560, 1).frame).toBe(4);
    expect(catPose(2, 140, 4).frame).toBe(4);
  });
  it('adds one small breath inside each curled rest, returning to neutral before stretching', () => {
    const samples = [[25, 0], [25.999, 0], [26, 0.5], [27.25, 0.5], [28.499, 0.5], [28.5, 0], [29.999, 0], [30, 0]];
    for (const [seconds, breath] of samples) {
      for (const offset of [-catPeriod, -catLegDuration, 0, catLegDuration, catPeriod]) {
        expect(catPose(seconds + offset, 640).breath).toBe(breath);
      }
    }
    for (let seconds = 0; seconds < catPeriod; seconds += 0.125) {
      const pose = catPose(seconds, 640);
      expect([0, 0.5]).toContain(pose.breath);
      if (pose.frame !== 7) expect(pose.breath).toBe(0);
    }
  });
  it('repeats every 72 seconds without taking the cat outside mobile roof bounds', () => {
    for (const width of [140, 185, 640, 1280]) {
      for (let seconds = 0; seconds < catPeriod; seconds += 0.25) {
        const pose = catPose(seconds, width);
        expect(catPose(seconds + catPeriod, width)).toEqual(pose);
        expect(pose.x - 12).toBeGreaterThanOrEqual(0);
        expect(pose.x + 14).toBeLessThan(width);
        expect(pose.frame).toBeGreaterThanOrEqual(0);
        expect(pose.frame).toBeLessThanOrEqual(8);
      }
    }
    expect(catPose(-1, 640)).toEqual(catPose(catPeriod - 1, 640));
  });
});
