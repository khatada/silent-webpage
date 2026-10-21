import { describe, expect, it } from 'vitest';
import { pixelViewport } from './pixel-viewport';

describe('physical pixel viewport', () => {
  it('covers desktop and mobile screens with uniform integer physical pixel cells', () => {
    for (const [width, height] of [[1440, 900], [390, 844], [295, 844], [1023.5, 767.25]]) {
      for (const ratio of [1, 1.25, 1.5, 2, 2.625, 3]) {
        const viewport = pixelViewport(width, height, ratio);
        expect(Number.isInteger(viewport.width)).toBe(true);
        expect(Number.isInteger(viewport.height)).toBe(true);
        expect(Number.isInteger(viewport.physicalScale)).toBe(true);
        expect(viewport.cssWidth).toBeGreaterThanOrEqual(width - 1e-9);
        expect(viewport.cssHeight).toBeGreaterThanOrEqual(height - 1e-9);
        expect((viewport.cssWidth - width) * ratio).toBeLessThan(viewport.physicalScale + 1e-9);
        expect((viewport.cssHeight - height) * ratio).toBeLessThan(viewport.physicalScale + 1e-9);
        expect(viewport.cssWidth * ratio / viewport.width).toBeCloseTo(viewport.physicalScale);
        expect(viewport.cssHeight * ratio / viewport.height).toBeCloseTo(viewport.physicalScale);
      }
    }
  });

  it('keeps the world composition at height 400 without stretching its aspect', () => {
    const viewport = pixelViewport(390, 844, 3);
    expect(400 * viewport.worldScale).toBe(viewport.height);
    expect(viewport.worldWidth * viewport.worldScale).toBeCloseTo(viewport.width);
    expect(viewport.worldWidth / 400).toBeCloseTo(viewport.cssWidth / viewport.cssHeight);
    expect(viewport.height).toBeGreaterThan(400);
  });

  it('uses safe dimensions before layout or device metrics are available', () => {
    const viewport = pixelViewport(0, Number.NaN, 0);
    expect(viewport.width).toBe(1280);
    expect(viewport.height).toBe(800);
    expect(viewport.physicalScale).toBe(1);
  });
});
