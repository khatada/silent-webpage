import { describe, expect, it } from 'vitest';
import { travelPosition } from './animation';
import { generatedLayout } from './generated-layout';
import { trainServiceOffsets } from './train-service';

describe('shared-track train service', () => {
  it('adds a second train only when a full train-length gap fits, including after resize', () => {
    for (const [width, expected] of [[303, 1], [304, 2], [500, 2], [200, 1], [304, 2]]) {
      expect(trainServiceOffsets(width, 100)).toHaveLength(expected);
      expect(trainServiceOffsets(width, 100)[0]).toBe(0);
    }
  });
  it('preserves the lead phase and keeps equal, non-overlapping headways over a full loop', () => {
    const views = [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080],
      [800, 600], [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667]];
    for (const [width, height] of views) {
      const layout = generatedLayout(width, height);
      const length = 264 * 0.24 * layout.scale * layout.composition.actorScale;
      const speed = layout.scale * 16, span = width + length;
      const offsets = trainServiceOffsets(width, length);
      expect(offsets).toHaveLength(width === 295 ? 1 : 2);
      const initialX = width * 0.25 - length / 2;
      const period = span / speed;
      for (let step = -20; step <= 200; step++) {
        const seconds = period * step / 100;
        const positions = offsets.map(offset => travelPosition(seconds, width, length, speed, initialX + offset));
        expect(positions[0]).toBe(travelPosition(seconds, width, length, speed, initialX));
        for (const x of positions) {
          expect(x).toBeGreaterThanOrEqual(Math.floor(-length));
          expect(x).toBeLessThan(width);
        }
        if (positions.length === 2) {
          const separation = Math.abs(positions[1] - positions[0]);
          expect(Math.abs(separation - span / 2)).toBeLessThanOrEqual(1);
          expect(separation - length).toBeGreaterThanOrEqual(length + 1);
          expect(span - separation - length).toBeGreaterThanOrEqual(length + 1);
        }
      }
    }
  });
  it('wraps each additional phase only while the complete train is offscreen', () => {
    const width = 390, length = 126.72, speed = 32, initialX = 124;
    const span = width + length;
    for (const offset of trainServiceOffsets(width, length)) {
      const wrap = (width - initialX - offset) / speed;
      for (const cycle of [0, 1, 2]) {
        const seconds = wrap + cycle * span / speed;
        const before = travelPosition(seconds - 0.0001, width, length, speed, initialX + offset);
        const after = travelPosition(seconds + 0.0001, width, length, speed, initialX + offset);
        expect(before).toBeGreaterThanOrEqual(width - 1);
        expect(after + length).toBeLessThanOrEqual(0);
        expect(travelPosition(seconds + length / speed + 0.1, width, length, speed, initialX + offset)).toBeGreaterThan(-length);
      }
    }
  });
});
