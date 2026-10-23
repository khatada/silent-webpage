import { describe, expect, it } from 'vitest';
import { meteorArt, meteorGeometry } from './image-meteor';
import { generatedLayout } from './generated-layout';
import { pixelViewport } from './pixel-viewport';

export const meteorViewports = [
  ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['narrow', 295, 844, 1],
  ['landscape', 844, 390, 2], ['wide', 2560, 1080, 1], ['compact', 800, 600, 1],
  ['tall', 390, 1025, 2], ['portrait-large', 900, 1600, 1], ['portrait-boundary', 1024, 1537, 1],
  ['small-phone', 320, 568, 2], ['small-mobile', 375, 667, 2],
] as const;

describe('generated meteor placement', () => {
  it.each(meteorViewports)('keeps the entire tail in native sky at %s', (_name, cssWidth, cssHeight, dpr) => {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const sky = generatedLayout(viewport.width, viewport.height).skyBottom;
    const path = meteorGeometry(viewport.width, sky);
    expect(path.visible).toBe(true);
    expect(path.width).toBeGreaterThanOrEqual(14);
    expect(path.width).toBeLessThanOrEqual(28);
    expect(Number.isInteger(path.width)).toBe(true);
    expect(path.height / path.width).toBeCloseTo(meteorArt.frame[3] / meteorArt.frame[2]);
    expect(path.dx).toBeGreaterThan(0);
    expect(path.dy / path.dx).toBe(meteorArt.slope);
    for (const progress of [0, 0.075, 0.5, 0.925, 1]) {
      const x = Math.round(path.x + path.dx * progress), y = Math.round(path.y + path.dy * progress);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(x + path.width).toBeLessThanOrEqual(viewport.width - 4);
      expect(y + path.height).toBeLessThanOrEqual(sky - 3);
      expect(x + path.width).toBeLessThan(viewport.width * 0.7);
    }
  });
  it('omits the event when a very short sky cannot contain a moving full tail', () => {
    for (const height of [185, 186, 190]) {
      const sky = generatedLayout(844, height).skyBottom;
      const path = meteorGeometry(844, sky);
      expect(path.visible).toBe(false);
    }
    // A resize restores ordinary geometry instead of retaining a disabled state.
    expect(meteorGeometry(844, generatedLayout(844, 390).skyBottom).visible).toBe(true);
    expect(meteorGeometry(844, 19).visible).toBe(false);
    expect(meteorGeometry(844, generatedLayout(844, 184).skyBottom).visible).toBe(true);
    expect(meteorGeometry(844, 20).visible).toBe(true);
  });
});
