import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { skylineLightDarkness } from './skyline-light-timing';

// Reviewed light cores and nearby dark interiors from the same generated building.
export const skylineLightScenes = [
  [
    { lit: [196, 181, 2, 2], dark: [195, 179, 2, 2] },
    { lit: [258, 178, 2, 2], dark: [259, 176, 2, 2] },
    { lit: [294, 124, 2, 2], dark: [296, 122, 2, 2] },
    { lit: [363, 150, 2, 2], dark: [367, 150, 2, 2] },
    { lit: [533, 174, 2, 2], dark: [532, 172, 2, 2] },
    { lit: [567, 192, 2, 2], dark: [565, 191, 2, 2] },
  ],
  [
    { lit: [110, 81, 1, 1], dark: [108, 81, 1, 1] },
    { lit: [206, 101, 1, 1], dark: [205, 100, 1, 1] },
    { lit: [247, 91, 1, 1], dark: [245, 91, 1, 1] },
    { lit: [302, 95, 1, 1], dark: [303, 94, 1, 1] },
    { lit: [455, 90, 1, 1], dark: [453, 90, 1, 1] },
    { lit: [529, 104, 1, 1], dark: [531, 103, 1, 1] },
  ],
  [
    { lit: [488, 616, 2, 2], dark: [486, 614, 2, 2] },
    { lit: [251, 600, 2, 2], dark: [250, 602, 2, 2] },
    { lit: [376, 588, 2, 2], dark: [374, 587, 2, 2] },
    { lit: [431, 575, 2, 2], dark: [433, 573, 2, 2] },
    { lit: [743, 590, 2, 2], dark: [742, 592, 2, 2] },
    { lit: [687, 634, 2, 2], dark: [686, 636, 2, 2] },
  ],
 ] as const;

/** Reuse generated pixels only; source windows, frames and surrounding glow stay in place. */
export function createImageSkylineLights(backgrounds: readonly Texture[]) {
  const textures = skylineLightScenes.map((windows, composition) => windows.map(({ dark }) =>
    new Texture({ source: backgrounds[composition].source, frame: new Rectangle(...dark) })));
  function createSprite(composition: 0 | 1 | 2, scale: number, originX: number, originY: number) {
    const root = new Container();
    root.position.set(originX, originY);
    root.scale.set(scale);
    const windows = skylineLightScenes[composition].map(({ lit: [x, y] }, index) => {
      const window = new Sprite(textures[composition][index]);
      window.position.set(x, y);
      root.addChild(window);
      return window;
    });
    return { root, windows, composition };
  }
  function update(actor: ReturnType<typeof createSprite>, seconds: number) {
    actor.windows.forEach((window, index) => { window.alpha = skylineLightDarkness(seconds, index, actor.composition); });
  }
  return { createSprite, update, destroy() { textures.flat().forEach(texture => texture.destroy(false)); } };
}
