import { describe, expect, it } from 'vitest';
import { residentFrame } from './resident-timing';

describe('seated resident timing', () => {
  it('passes through the intermediate bend before and after the held lowered head', () => {
    expect([0, 8.999, 9, 10.499, 10.5, 13.499, 13.5, 14.999, 15, 19.999, 20]
      .map(seconds => residentFrame(seconds))).toEqual([0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0]);
  });
  it('keeps compositions out of phase and resumes without depending on update count', () => {
    expect(residentFrame(3, 0)).toBe(0);
    expect(residentFrame(3, 7)).toBe(1);
    for (const seconds of [-20, -0.001, 0, 9, 10.5, 13.5, 15, 19.999]) {
      for (const offset of [0, 7]) expect(residentFrame(seconds + 2000, offset)).toBe(residentFrame(seconds, offset));
    }
  });
});
