import { describe, expect, it } from 'vitest';
import { plantFrame, plantPeriod } from './plant-timing';

describe('rooftop plant breeze', () => {
  it('holds neutral between small movements, including a continuous neutral wrap', () => {
    for (const offset of [-plantPeriod, 0, plantPeriod, plantPeriod * 100]) {
      for (const [seconds, frame] of [[0, 0], [4.4999, 0], [4.5, 1], [6.7499, 1], [6.75, 0],
        [11.2499, 0], [11.25, 2], [13.4999, 2], [13.5, 0], [17.9999, 0], [18, 0]]) {
        expect(plantFrame(seconds + offset)).toBe(frame);
      }
    }
  });
});
