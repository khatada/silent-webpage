import { describe, expect, it } from 'vitest';
import { meteorArt, meteorGeometry } from './image-meteor';
import { generatedLayout } from './generated-layout';
import { pixelViewport } from './pixel-viewport';
import { travelPosition } from './animation';
import { cityMotion } from './city-motion';
import { meteorTiming } from './meteor-timing';
import { upperCloudArt } from './image-upper-cloud';

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
    expect(path.dx).toBeGreaterThanOrEqual(14);
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
  it.each(meteorViewports)('clears the main cloud during the first flight at %s', (_name, cssWidth, cssHeight, dpr) => {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const path = meteorGeometry(viewport.width, layout.skyBottom);
    // Both clouds use the same reviewed crop; its measured alpha bounds are shared.
    const [left, top, right, bottom] = upperCloudArt.alphaBounds;
    for (const progress of [0, 0.25, 0.5, 0.75, 0.995]) {
      const seconds = meteorTiming.first + meteorTiming.duration * progress;
      const cloudX = travelPosition(seconds, viewport.width, 235 * layout.cloudScale,
        layout.motionScale * cityMotion.cloudSpeed, viewport.width * 0.12);
      const meteorX = Math.round(path.x + path.dx * progress);
      const meteorY = Math.round(path.y + path.dy * progress);
      const separate = meteorX + path.width <= cloudX + left * layout.cloudScale
        || meteorX >= cloudX + right * layout.cloudScale
        || meteorY + path.height <= layout.cloudY + top * layout.cloudScale
        || meteorY >= layout.cloudY + bottom * layout.cloudScale;
      expect(separate).toBe(true);
    }
  });
  it('omits the event when a very short sky cannot contain a moving full tail', () => {
    for (const height of [20, 30, 40]) {
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
