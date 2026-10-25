import { Texture, TextureSource } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { generatedArt } from './generated-art';
import { generatedLayout } from './generated-layout';
import { createImageRoomLights, roomLightAreas } from './image-room-lights';

describe('room glass coverage', () => {
  it('shares the existing room alpha without duplicating the replaced wide cover', () => {
    const sources = [generatedArt, generatedArt.wide, generatedArt.portrait].map(composition =>
      new Texture({ source: new TextureSource({ width: composition.width, height: composition.height }) }));
    const covers = createImageRoomLights(sources);
    [generatedArt, generatedArt.wide, generatedArt.portrait].forEach((composition, compositionIndex) => {
      const compositionId = compositionIndex as 0 | 1 | 2;
      const area = roomLightAreas[compositionId];
      composition.windows.forEach((window, index) => {
        const group = covers.createCover(compositionId, index, window, sources[compositionId], 0.5, -17, 23);
        const selected = index === area.windowIndex;
        expect(group.children.length).toBe(selected && !area.replace ? 2 : 1);
        const original = group.children[0];
        if (!selected || !area.replace) {
          expect(original.x).toBe(-17 + window[0] * 0.5);
          expect(original.y).toBe(23 + window[1] * 0.5);
          expect(original.width).toBe(window[2] * 0.5);
          expect(original.height).toBe(window[3] * 0.5);
        }
        if (selected) {
          const extra = group.children.at(-1)!;
          expect(extra.parent).toBe(group);
          expect(extra.x).toBe(-17 + area.glass[0] * 0.5);
          expect(extra.y).toBe(23 + area.glass[1] * 0.5);
          expect(extra.width).toBe(area.glass[2] * 0.5);
          expect(extra.height).toBe(area.glass[3] * 0.5);
        }
        group.destroy({ children: true });
      });
    });
    covers.destroy();
    // Factory disposal owns only subtextures; shared Assets sources remain reusable.
    for (const source of sources) expect(source.source.destroyed).toBe(false);
  });
  it('keeps the added glass wholly visible in all eleven responsive compositions', () => {
    for (const [width, height] of [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080],
      [800, 600], [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667]]) {
      const layout = generatedLayout(width, height);
      const area = roomLightAreas[layout.portrait ? 2 : layout.wide ? 1 : 0];
      const [x, y, w, h] = area.glass;
      const left = layout.originX + x * layout.scale, top = layout.originY + y * layout.scale;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(left + w * layout.scale).toBeLessThanOrEqual(width);
      expect(top + h * layout.scale).toBeLessThanOrEqual(height);
    }
  });
});
