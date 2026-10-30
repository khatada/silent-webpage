import { describe, expect, it } from 'vitest';
import { generatedLayout } from './generated-layout';
import { pixelViewport } from './pixel-viewport';
import { createTrainServiceSchedule, sceneTrainService, trainServiceOffsets, trainServiceState } from './train-service';

const views = [[1440, 900, 1], [390, 844, 2], [295, 844, 2], [844, 390, 2], [2560, 1080, 1],
  [800, 600, 1], [390, 1025, 3], [900, 1600, 1], [1024, 1537, 1], [320, 568, 2], [375, 667, 2],
  [1440, 900, 1.5]] as const;
const schedules = views.map(([cssWidth, cssHeight, dpr]) => {
  const viewport = pixelViewport(cssWidth, cssHeight, dpr);
  const layout = generatedLayout(viewport.width, viewport.height);
  const length = 264 * 0.24 * layout.motionScale * layout.composition.actorScale;
  const baseSpeed = layout.motionScale * 16;
  const production = sceneTrainService(viewport.width, viewport.height, layout);
  const initialX = production.initialX;
  return { viewport, layout, length, baseSpeed, initialX,
    service: production.schedule };
});
const intersects = (state: ReturnType<typeof trainServiceState>[number], width: number, length: number) =>
  state.visible && state.x < width && state.x + length > 0;

describe('alternating shared-track train service', () => {
  it('retains the size threshold and average departure frequency using the production motion scale', () => {
    for (const [width, expected] of [[303, 1], [304, 2], [500, 2], [200, 1], [304, 2]]) {
      expect(trainServiceOffsets(width, 100)).toHaveLength(expected);
    }
    for (const { viewport, length, baseSpeed, service } of schedules) {
      const originalPeriod = (viewport.width + length) / baseSpeed;
      expect(service.period).toBe(originalPeriod);
      expect(service.count / service.period).toBe(trainServiceOffsets(viewport.width, length).length / originalPeriod);
      expect(service.travelDuration + (service.count - 1) * service.startGap + service.clearance).toBeCloseTo(service.period, 10);
    }
    const wide = schedules[4], fractional = schedules[11];
    expect(wide.layout.scale).toBe(4);
    expect(wide.layout.motionScale).toBe(5);
    expect(wide.length).toBeCloseTo(158.4);
    expect(fractional.viewport.width).toBe(1080);
    expect(fractional.layout.motionScale).toBe(3);
  });

  it('never overlaps trains or mixes directions throughout repeated trips', () => {
    for (const { viewport, length, baseSpeed, service } of schedules) {
      for (let step = -200; step <= 800; step++) {
        const states = trainServiceState(service, service.period * step / 100 - service.phase);
        const visible = states.filter(state => intersects(state, viewport.width, length));
        expect(new Set(visible.map(state => state.direction)).size).toBeLessThanOrEqual(1);
        if (visible.length === 2) {
          visible.sort((a, b) => a.x - b.x);
          expect(visible[1].x - visible[0].x - length).toBeGreaterThanOrEqual(length + Math.max(4, baseSpeed / 4) - 1.000001);
        }
      }
    }
  });

  it('fully clears the track before the next direction enters with a different train colour', () => {
    const epsilon = 0.000001;
    for (const { viewport, length, service } of schedules) {
      for (const batch of [-2, -1, 0, 1, 2, 3]) {
        const origin = batch * service.period - service.phase;
        const lastExit = origin + service.period - service.clearance;
        const justBefore = trainServiceState(service, lastExit - epsilon);
        expect(justBefore.at(-1)!.visible).toBe(true);
        for (const time of [lastExit + epsilon, lastExit + service.clearance / 2]) {
          expect(trainServiceState(service, time).some(state => intersects(state, viewport.width, length))).toBe(false);
        }
        const nextEntry = origin + service.period;
        const entering = trainServiceState(service, nextEntry + epsilon)[0];
        expect(entering.direction).toBe(-justBefore[0].direction);
        expect(entering.colour).not.toBe(justBefore.at(-1)!.colour);
        const fullyInside = trainServiceState(service, nextEntry + length / service.speed + 0.01)[0];
        expect(fullyInside.visible).toBe(true);
        expect(fullyInside.x).toBeGreaterThanOrEqual(-1);
        expect(fullyInside.x + length).toBeLessThanOrEqual(viewport.width + 1);
      }
    }
  });

  it('preserves the initial lead placement and remains deterministic when the clock is paused', () => {
    for (const { initialX, service } of schedules) {
      const initial = trainServiceState(service, 0)[0];
      expect(initial.direction).toBe(1);
      expect(initial.colour).toBe(0);
      expect(initial.x).toBe(Math.floor(initialX));
      expect(initial.visible).toBe(true);
      for (const seconds of [0, 12.5, 1000.25, 1_000_000]) {
        const paused = trainServiceState(service, seconds);
        expect(trainServiceState(service, seconds)).toEqual(paused);
      }
    }
  });

  it('keeps tiny valid service intervals finite and rejects invalid geometry and time', () => {
    const tiny = createTrainServiceSchedule(0.01, 0.01, 100, 0);
    expect(tiny.clearance).toBeLessThan(tiny.period);
    expect(Number.isFinite(tiny.speed)).toBe(true);
    expect(trainServiceState(tiny, 10)).toHaveLength(1);
    for (const [width, length, speed, initial] of [[0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 0],
      [Number.NaN, 1, 1, 0], [1, 1, Number.POSITIVE_INFINITY, 0], [1, 1, 1, Number.NaN]]) {
      expect(() => createTrainServiceSchedule(width, length, speed, initial)).toThrow(RangeError);
    }
    expect(() => trainServiceState(tiny, Number.NaN)).toThrow(RangeError);
  });
});
