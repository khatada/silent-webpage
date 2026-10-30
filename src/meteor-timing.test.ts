import { describe, expect, it } from 'vitest';
import { meteorState, meteorTiming } from './meteor-timing';

describe('occasional meteor scene timing', () => {
  it('waits for the initial scene and keeps a long empty interval', () => {
    for (const seconds of [-10, 0, 2.999, 5, 20, 30.999, NaN, Infinity, -Infinity]) {
      expect(meteorState(seconds)).toEqual({ progress: 0, alpha: 0 });
    }
    expect(meteorState(3)).toEqual({ progress: 0, alpha: 0 });
    expect(meteorState(4)).toEqual({ progress: 0.5, alpha: 1 });
    expect(meteorState(32)).toEqual(meteorState(4));
  });
  it('gently fades both endpoints without a bright flash', () => {
    expect(meteorState(3.225).alpha).toBeCloseTo(0.5);
    expect(meteorState(4.775).alpha).toBeCloseTo(0.5);
    expect(meteorState(4.99999).alpha).toBeLessThan(0.000001);
    for (let phase = 0; phase < 2; phase += 0.01) {
      const state = meteorState(3 + phase);
      expect(state.alpha).toBeGreaterThanOrEqual(0);
      expect(state.alpha).toBeLessThanOrEqual(meteorTiming.peakAlpha);
      expect(state.progress).toBeCloseTo(phase / 2);
    }
  });
  it('is deterministic when paused, resized or advanced by a large time jump', () => {
    const frozen = meteorState(4);
    for (let update = 0; update < 20; update++) expect(meteorState(4)).toEqual(frozen);
    expect(meteorState(3 + 28 * 100000 + 1)).toEqual(frozen);
    expect(meteorState(3 + 28 * 100000 + 25).alpha).toBe(0);
  });
});
