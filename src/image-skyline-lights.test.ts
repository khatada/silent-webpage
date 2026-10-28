import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { createLogicalBackground } from './logical-background';
import { createImageSkylineLights, skylineLightScenes } from './image-skyline-lights';
import { starCoreSampled } from './image-stars';
import { skylineLightDarkness } from './skyline-light-timing';
import { wideFineArt } from './wide-fine-art';

describe('grouped wide skyline windows', () => {
  it('shares one clock per window and only draws native pixels sampled at each scale', () => {
    const regular = new Texture({ source: new TextureSource({ width: 1024, height: 1024 }) });
    const native = new Texture({ source: new TextureSource({ width: 1446, height: 482 }) });
    const wide = createLogicalBackground(native, 723, 241, 2);
    const factory = createImageSkylineLights([regular, wide, regular]);
    for (const scale of [0.5, 1, 2, 4]) {
      const actor = factory.createSprite(1, scale, 0, 0);
      factory.update(actor, 24.5);
      expect(actor.windows).toHaveLength(16);
      actor.windows.forEach((window, index) => expect(window.alpha).toBe(skylineLightDarkness(24.5, index, 1)));
      actor.groups.forEach((group, index) => {
        expect(group.alpha).toBe(skylineLightDarkness(24.5, skylineLightScenes[1].length + index, 1));
        const [x, y] = wideFineArt.skylineGroups[index].lit;
        group.children.forEach((sprite, pixel) => {
          expect(sprite.visible).toBe(starCoreSampled(x + pixel % 2 / 2, y + Math.floor(pixel / 2) / 2, scale, 2));
        });
      });
      actor.root.destroy({ children: true });
    }
    const other = factory.createSprite(0, 2, 0, 0);
    expect(other.groups).toHaveLength(0);
    other.root.destroy({ children: true });
    factory.destroy(); wide.destroy(false); native.destroy(true); regular.destroy(true);
  });
});
