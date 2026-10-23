import { describe, expect, it } from 'vitest';
import { meteorState, meteorTiming } from './meteor-timing';

describe('rare meteor scene timing', () => {
  it('waits for the initial scene and keeps a long empty interval', () => {
    for (const seconds of [-10, 0, 5.999, 8, 50, 95.999, NaN, Infinity, -Infinity]) {
      expect(meteorState(seconds)).toEqual({ progress: 0, alpha: 0 });
    }
    expect(meteorState(6)).toEqual({ progress: 0, alpha: 0 });
    expect(meteorState(7)).toEqual({ progress: 0.5, alpha: 0.6 });
    expect(meteorState(97)).toEqual(meteorState(7));
  });
  it('gently fades both endpoints without a bright flash', () => {
    expect(meteorState(6.225).alpha).toBeCloseTo(0.3);
    expect(meteorState(7.775).alpha).toBeCloseTo(0.3);
    expect(meteorState(7.99999).alpha).toBeLessThan(0.000001);
    for (let phase = 0; phase < 2; phase += 0.01) {
      const state = meteorState(6 + phase);
      expect(state.alpha).toBeGreaterThanOrEqual(0);
      expect(state.alpha).toBeLessThanOrEqual(meteorTiming.peakAlpha);
      expect(state.progress).toBeCloseTo(phase / 2);
    }
  });
  it('is deterministic when paused, resized or advanced by a large time jump', () => {
    const frozen = meteorState(7);
    for (let update = 0; update < 20; update++) expect(meteorState(7)).toEqual(frozen);
    expect(meteorState(6 + 90 * 100000 + 1)).toEqual(frozen);
    expect(meteorState(6 + 90 * 100000 + 25).alpha).toBe(0);
  });
});
