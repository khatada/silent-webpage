import { describe, expect, it } from 'vitest';
import { generatedLayout } from './generated-layout';

describe('generated scenery keeps its moving subjects visible', () => {
  it('covers ordinary wide screens with uniform native pixels while preserving legacy actor speed', () => {
    const views = [[1920, 720, 3], [3200, 1080, 5], [3840, 1080, 5],
      [1920, 1080, 5], [2560, 1080, 5], [1280, 720, 3]];
    for (const [width, height, previousScale] of views) {
      const layout = generatedLayout(width, height);
      expect(layout.wide).toBe(true);
      expect(layout.scale % 2).toBe(0);
      expect(layout.composition.width * layout.scale).toBeGreaterThanOrEqual(width);
      expect(layout.originX).toBeLessThanOrEqual(0);
      expect(layout.originX + layout.composition.width * layout.scale).toBeGreaterThanOrEqual(width);
      expect(layout.motionScale).toBe(previousScale);
      expect(layout.skyBottom).toBeGreaterThanOrEqual(Math.ceil(height * 0.05));
      expect(layout.catY).toBeLessThan(height);
    }
  });
  it('keeps reciprocal sampling and finite motion in tiny skies and exposes only unavoidable edge extensions', () => {
    const impossible = generatedLayout(2000, 500);
    expect(impossible.composition.width * impossible.scale).toBeLessThan(2000);
    for (const [width, height] of [[320, 100], [1000, 20], [844, 1]]) {
      const layout = generatedLayout(width, height);
      expect(layout.scale).toBeGreaterThan(0);
      expect(layout.motionScale).toBeGreaterThan(0);
      expect(1 / (layout.scale / 2)).toBeCloseTo(Math.round(1 / (layout.scale / 2)));
      expect(Number.isFinite(layout.originY)).toBe(true);
    }
  });
  it.each([[844, 390], [2560, 1080], [1440, 900], [390, 844],
    [1740, 1000], [1750, 1000], [1900, 1000], [800, 600], [390, 1025], [1920, 1080], [900, 1600], [1024, 1537], [320, 568], [375, 667]])('retains sky, railway and rooftop at %ix%i', (width, height) => {
    const layout = generatedLayout(width, height);
    const factor = layout.scale * layout.composition.actorScale;
    expect(layout.composition.stars.some(([x, y]) => {
      const px = layout.originX + x * layout.scale;
      const py = layout.originY + y * layout.scale;
      return px >= 0 && px < width && py >= 0 && py < layout.railBottom;
    })).toBe(true);
    const clearSkyBottom = layout.skyBottom;
    expect(clearSkyBottom).toBeGreaterThan(height * 0.05);
    expect(layout.railBottom).toBeGreaterThan(65 * factor * 0.24);
    expect(layout.railBottom).toBeLessThan(height);
    expect(layout.aircraftY).toBeGreaterThanOrEqual(0);
    expect(layout.aircraftY + 100 * layout.aircraftScale).toBeLessThan(layout.railBottom);
    expect(layout.cloudY).toBeGreaterThanOrEqual(0);
    expect(layout.cloudY + 70 * layout.cloudScale).toBeLessThan(layout.railBottom);
    expect(layout.aircraftY + 100 * layout.aircraftScale).toBeLessThanOrEqual(layout.skyBottom + 1);
    expect(layout.cloudY + 70 * layout.cloudScale).toBeLessThanOrEqual(layout.skyBottom + 1);
    if (width === 390 && height === 1025) {
      expect(layout.portrait).toBe(true);
      expect(layout.scale).toBe(1);
    }
    expect(layout.catY).toBeGreaterThan(layout.railBottom);
    expect(layout.catY).toBeLessThan(height);
    expect(layout.aircraftScale).toBeGreaterThanOrEqual(factor * 0.17 * 0.5);
    expect(layout.cloudScale).toBeGreaterThanOrEqual(factor * 0.7 * 0.5);
    if (width / height < 0.8 && layout.portrait) {
      expect(layout.scale).toBe(height < 900 ? 0.5 : 1);
    }
  });
});
