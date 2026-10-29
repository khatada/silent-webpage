import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { generatedLayout } from './generated-layout';
import { createImageLaundry, wideLaundryGeometry } from './image-laundry';

describe('wide rooftop towels', () => {
  it('keeps the visible pair within the wall and viewport, omitting tiny or clipped layouts', () => {
    for (const [width, height] of [[2560, 1080], [1920, 1080], [800, 600], [844, 390], [3200, 1080], [2000, 500]]) {
      const layout = generatedLayout(width, height);
      const geometry = wideLaundryGeometry(width, height, layout.scale, layout.originX, layout.originY);
      expect(geometry.visible).toBe(true);
      expect(geometry.height).toBeGreaterThanOrEqual(24);
      expect(geometry.y + geometry.height).toBeLessThan(geometry.floorY);
      expect(geometry.floorY).toBeLessThan(layout.catY);
    }
    const tiny = generatedLayout(480, 270);
    expect(wideLaundryGeometry(480, 270, tiny.scale, tiny.originX, tiny.originY).visible).toBe(false);
    expect(wideLaundryGeometry(844, 390, 2, -600, -46).visible).toBe(false);
    expect(wideLaundryGeometry(844, 390, Number.NaN, 0, 0).visible).toBe(false);
  });

  it('changes the hanging body while keeping the supporting fold and anchor stationary', () => {
    const source = new Texture({ source: new TextureSource({ width: 600, height: 180 }) });
    const laundry = createImageLaundry(source);
    const actor = laundry.createSprite(2, 4, -166, 58);
    const geometry = wideLaundryGeometry(2560, 1080, 4, -166, 58);
    const support = actor.root.children[1];
    const position = actor.root.position.clone();
    const poseTextures = new Set<Texture>();
    for (const seconds of [0, 4, 6.5, 9]) {
      laundry.update(actor, seconds);
      poseTextures.add(actor.body.texture);
      expect(actor.root.children[1]).toBe(support);
      expect(actor.root.position.equals(position)).toBe(true);
      expect(actor.root.x).toBe(geometry.x);
      expect(actor.root.y).toBe(geometry.y);
    }
    expect(poseTextures.size).toBe(4);
    actor.root.destroy({ children: true });
    laundry.destroy(); source.destroy(true);
  });
});
