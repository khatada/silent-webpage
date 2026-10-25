import { describe, expect, it } from 'vitest';
import { cityMotion, residentialLightCycle } from './city-motion';
import { windowBrightness } from './animation';
import { generatedLayout } from './generated-layout';

describe('readable city motion', () => {
  it('moves large sky actors visibly during a short glance, even on a small phone', () => {
    for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
      const { scale } = generatedLayout(width, height);
      expect(cityMotion.cloudSpeed * scale * 8).toBeGreaterThanOrEqual(16);
      expect(cityMotion.aircraftSpeed * scale * 8).toBeGreaterThanOrEqual(40);
    }
  });
  it('changes several residential rooms in the first eight seconds without synchronizing them', () => {
    const changes = Array.from({ length: 9 }, (_, index) => {
      const { phase, period } = residentialLightCycle(index);
      const levels = Array.from({ length: 33 }, (_, step) => windowBrightness(step / 4, phase, period));
      return Math.max(...levels) - Math.min(...levels);
    });
    expect(changes.filter(change => change > 0.75).length).toBeGreaterThanOrEqual(6);
    const initial = Array.from({ length: 9 }, (_, index) => {
      const { phase, period } = residentialLightCycle(index);
      return windowBrightness(0, phase, period);
    });
    expect(initial.some(level => level === 0)).toBe(true);
    expect(initial.some(level => level === 1)).toBe(true);
  });
});
