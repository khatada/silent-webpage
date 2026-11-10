import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { generatedLayout } from './generated-layout';
import { createImageUpperCloud, upperCloudArt, upperCloudGeometry } from './image-upper-cloud';

const viewports = [[1440, 900, 1], [390, 844, 2], [295, 844, 1], [844, 390, 2], [2560, 1080, 1],
  [800, 600, 1], [390, 1025, 2], [900, 1600, 1], [1024, 1537, 1], [320, 568, 2], [375, 667, 2]] as const;
describe('upper cloud lane', () => {
  it('omits crowded representative skies and preserves margins in roomy ones', () => {
    const geometries = viewports.map(([width, height]) => upperCloudGeometry(generatedLayout(width, height)));
    expect(geometries.map(geometry => geometry.visible)).toEqual([true, false, false, false, true, true, true, true, true, true, true]);
    for (const geometry of geometries.filter(geometry => geometry.visible)) {
      expect(geometry.top).toBeGreaterThanOrEqual(4);
      expect(geometry.lowerTop - geometry.bottom).toBeGreaterThanOrEqual(4);
    }
  });
  it('moves the actual factory sprite at least sixteen physical pixels in eight seconds', () => {
    const texture = new Texture({ source: new TextureSource({ width: 235, height: 70 }) });
    const factory = createImageUpperCloud(texture);
    for (const [width, height, physicalScale] of viewports) {
      const layout = generatedLayout(width, height), sprite = factory.createSprite(layout);
      if (sprite.visible) {
        expect(sprite.alpha).toBe(0.32);
        factory.update(sprite, 0, width, layout.motionScale);
        const initialX = sprite.x;
        factory.update(sprite, 8, width, layout.motionScale);
        expect((sprite.x - initialX) * physicalScale).toBeGreaterThanOrEqual(16);
        expect(sprite.y).toBe(upperCloudGeometry(layout).y);
      }
      sprite.destroy();
    }
    texture.destroy(true);
  });
  it('keeps on-screen travel continuous and wraps only beyond the complete cloud', () => {
    const texture = new Texture({ source: new TextureSource({ width: 235, height: 70 }) });
    const factory = createImageUpperCloud(texture);
    for (const [width, height] of viewports) {
      const layout = generatedLayout(width, height), sprite = factory.createSprite(layout);
      if (sprite.visible) {
        const speed = layout.motionScale * upperCloudArt.speed;
        const wrap = (width - width * 0.65) / speed;
        factory.update(sprite, wrap - 0.0001, width, layout.motionScale);
        expect(sprite.x).toBeGreaterThanOrEqual(width - 1);
        factory.update(sprite, wrap + 0.0001, width, layout.motionScale);
        expect(sprite.x + sprite.width).toBeLessThanOrEqual(0);
        factory.update(sprite, wrap + sprite.width / speed + 0.01, width, layout.motionScale);
        expect(sprite.x).toBeGreaterThan(-sprite.width);
        factory.update(sprite, 1, width, layout.motionScale);
        const x = sprite.x;
        factory.update(sprite, 1.01, width, layout.motionScale);
        expect(sprite.x - x).toBeGreaterThanOrEqual(0);
        expect(sprite.x - x).toBeLessThanOrEqual(1);
      }
      sprite.destroy();
    }
    texture.destroy(true);
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
