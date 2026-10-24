import { describe, expect, it } from 'vitest';
import { generatedLayout } from './generated-layout';
import { plantGeometry } from './image-plant';

describe('small plant floor placement', () => {
  it('keeps the fixed pot behind the cat and readable in all eleven representative layouts', () => {
    const sizes = [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080],
      [800, 600], [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667]];
    for (const [width, height] of sizes) {
      const layout = generatedLayout(width, height);
      const plant = plantGeometry(layout, width, height);
      expect(plant.visible).toBe(true);
      expect(plant.x).toBe(width / 2);
      expect(plant.height).toBeGreaterThanOrEqual(28);
      expect(plant.footY).toBeLessThan(layout.catY);
      expect(plant.x - plant.width / 2).toBeGreaterThanOrEqual(0);
      expect(plant.x + plant.width / 2).toBeLessThanOrEqual(width);
      expect(plant.top).toBeGreaterThanOrEqual(0);
      expect(plant.bottom).toBeLessThanOrEqual(height);
    }
  });
  it('omits tiny or unsupported layouts rather than floating outside the scene', () => {
    for (const [width, height] of [[100, 80], [5, 300], [1000, 20]]) {
      expect(plantGeometry(generatedLayout(width, height), width, height).visible).toBe(false);
    }
    const layout = generatedLayout(390, 844);
    expect(plantGeometry({ ...layout, catY: 100 }, 390, 844).visible).toBe(false);
    expect(plantGeometry({ ...layout, originY: -10000 }, 390, 844).visible).toBe(false);
  });
});
