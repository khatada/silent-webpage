import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { generatedLayout } from './generated-layout';
import { createImageWindsock, windsockFrame, windsockGeometry } from './image-windsock';

describe('generated rooftop windsock', () => {
  it('keeps the complete generated prop within supported wide viewports', () => {
    for (const [w, h, density] of [[2560, 1080, 1], [800, 600, 1], [844, 390, 2], [3200, 1080, 1]]) {
      const layout = generatedLayout(w, h), g = windsockGeometry(w, h, layout, density);
      expect(g.visible).toBe(true); expect(g.physicalHeight).toBeGreaterThanOrEqual(60);
      expect(g.physicalHeight).toBeLessThanOrEqual(90); expect(g.y).toBeLessThan(layout.catY);
      expect(g.left).toBeGreaterThanOrEqual(0); expect(g.right).toBeLessThanOrEqual(w);
    }
    expect(windsockGeometry(1440, 900, generatedLayout(1440, 900), 1).visible).toBe(false);
    expect(windsockGeometry(200, 360, generatedLayout(200, 360), 1).visible).toBe(false);
    const layout = generatedLayout(800, 600);
    expect(windsockGeometry(800, 600, { ...layout, originX: -1000 }, 1).visible).toBe(false);
  });
  it('moves only the cloth and traverses intermediate poses in both directions', () => {
    const source = new Texture({ source: new TextureSource({ width: 724, height: 241 }) });
    const factory = createImageWindsock(source);
    const actor = factory.createSprite(windsockGeometry(800, 600, generatedLayout(800, 600), 1));
    const position = actor.root.position.clone(), pole = actor.pole.texture;
    expect([0.1, 0.7, 1.1, 1.6, 2, 2.6, 3, 3.5].map(windsockFrame)).toEqual([0, 1, 2, 1, 0, 3, 4, 3]);
    for (const time of [0.1, 0.7, 1.1, 1.6, 2, 2.6, 3, 3.5]) {
      factory.update(actor, time); expect(actor.pole.texture).toBe(pole);
      expect(actor.root.position.equals(position)).toBe(true);
      expect(windsockFrame(time + 3.7)).toBe(windsockFrame(time));
    }
    factory.update(actor, 1.1); const paused = actor.body.texture;
    factory.update(actor, 1.1); expect(actor.body.texture).toBe(paused);
    actor.root.destroy({ children: true }); factory.destroy(); source.destroy(true);
  });
});
