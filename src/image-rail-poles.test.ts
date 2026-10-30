import { describe, expect, it, vi } from 'vitest';
import { Sprite, Texture, TextureSource, type Renderer } from 'pixi.js';
import { createImageRailPoles } from './image-rail-poles';

describe('rail pole sampling', () => {
  it('renders the background with the requested pixel rounding before integer viewport crops', () => {
    const render = vi.fn();
    const renderer = { render } as unknown as Renderer;
    const background = new Texture({ source: new TextureSource({ width: 1024, height: 1024 }) });
    for (const rounding of [false, true]) {
      const sampled = createImageRailPoles(renderer, background, [[116, 732, 4, 33], [0, 0, 4, 4]],
        0.5, -21, 33, 469, 834, rounding);
      const call = render.mock.lastCall?.[0] as { container: Sprite };
      expect(call.container.roundPixels).toBe(rounding);
      expect(sampled.poles).toHaveLength(1);
      expect(sampled.poles[0].art.position.x).toBe(37);
      expect(sampled.poles[0].art.position.y).toBe(399);
      expect(sampled.poles[0].art.width).toBe(2);
      expect(sampled.poles[0].art.height).toBe(17);
      sampled.poles.forEach(({ art }) => art.destroy());
      sampled.destroy();
    }
    background.destroy(true);
  });
});
