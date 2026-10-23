import { describe, expect, it } from 'vitest';
import { generatedLayout } from './generated-layout';
import { upperCloudGeometry } from './image-upper-cloud';

const viewports = [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080],
  [800, 600], [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667]] as const;
describe('upper cloud lane', () => {
  it('omits crowded representative skies and preserves margins in roomy ones', () => {
    const geometries = viewports.map(([width, height]) => upperCloudGeometry(generatedLayout(width, height)));
    expect(geometries.map(geometry => geometry.visible)).toEqual([true, false, false, false, true, false, true, true, true, true, true]);
    for (const geometry of geometries.filter(geometry => geometry.visible)) {
      expect(geometry.top).toBeGreaterThanOrEqual(4);
      expect(geometry.lowerTop - geometry.bottom).toBeGreaterThanOrEqual(4);
    }
  });
  it('omits and restores the lane across the exact available-height boundary', () => {
    const base = { cloudScale: 1, cloudY: 19, skyBottom: 120 };
    expect(upperCloudGeometry(base).visible).toBe(false);
    const restored = upperCloudGeometry({ ...base, cloudY: 20 });
    expect(restored.visible).toBe(true);
    expect(restored.top).toBeGreaterThanOrEqual(4);
    expect(restored.lowerTop - restored.bottom).toBeGreaterThanOrEqual(4);
    expect(upperCloudGeometry({ ...base, skyBottom: 1 }).visible).toBe(false);
  });
});
