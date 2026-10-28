import { wideFineArt } from './wide-fine-art';
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { starDarkness } from './star-timing';

// Isolated cores and nearby dark-sky pixels from the same reviewed generated backgrounds.
export const starScenes = [
  [
    { core: [40, 27, 1, 1], dark: [40, 24, 1, 1] },
    { core: [294, 10, 1, 1], dark: [292, 11, 1, 1] },
    { core: [444, 22, 1, 1], dark: [446, 21, 1, 1] },
    { core: [635, 8, 1, 1], dark: [637, 7, 1, 1] },
    { core: [8, 38, 1, 1], dark: [8, 35, 1, 1] },
    { core: [354, 55, 1, 1], dark: [357, 55, 1, 1] },
    { core: [446, 56, 1, 1], dark: [443, 56, 1, 1] },
    { core: [761, 49, 1, 1], dark: [758, 49, 1, 1] },
    { core: [122, 65, 1, 1], dark: [119, 65, 1, 1] },
    { core: [290, 72, 1, 1], dark: [293, 72, 1, 1] },
    { core: [384, 65, 1, 1], dark: [381, 65, 1, 1] },
    { core: [640, 63, 1, 1], dark: [637, 63, 1, 1] },
    { core: [331, 92, 1, 1], dark: [330, 90, 1, 1] },
    { core: [321, 83, 1, 1], dark: [322, 81, 1, 1] },
  ],
  wideFineArt.starCores,
  [
    { core: [210, 24, 1, 1], dark: [208, 25, 1, 1] },
    { core: [486, 12, 1, 1], dark: [487, 14, 1, 1] },
    { core: [623, 54, 1, 1], dark: [621, 53, 1, 1] },
    { core: [780, 11, 1, 1], dark: [779, 9, 1, 1] },
    { core: [538, 496, 1, 1], dark: [537, 494, 1, 1] },
    { core: [302, 293, 1, 1], dark: [300, 294, 1, 1] },
    { core: [573, 265, 1, 1], dark: [575, 266, 1, 1] },
    { core: [786, 284, 1, 1], dark: [785, 286, 1, 1] },
    { core: [499, 475, 1, 1], dark: [501, 474, 1, 1] },
    { core: [424, 364, 1, 1], dark: [425, 366, 1, 1] },
    { core: [629, 338, 1, 1], dark: [631, 339, 1, 1] },
    { core: [923, 341, 1, 1], dark: [922, 343, 1, 1] },
    { core: [538, 406, 1, 1], dark: [537, 404, 1, 1] },
    { core: [403, 425, 1, 1], dark: [402, 423, 1, 1] },
    { core: [580, 364, 1, 1], dark: [579, 362, 1, 1] },
  ],
] as const;

/** Reciprocal-integer reduction samples one source pixel per cell, never its discarded neighbours. */
export function starCoreSampled(x: number, y: number, scale: number, resolution = 1) {
  x *= resolution;
  y *= resolution;
  scale /= resolution;
  if (scale >= 1) return true;
  const step = Math.round(1 / scale);
  const sampledOffset = Math.floor(step / 2);
  return x % step === sampledOffset && y % step === sampledOffset;
}

/** Share the background transform, including fractional nearest-neighbour sampling at half scale. */
export function createImageStars(backgrounds: readonly Texture[]) {
  const textures = starScenes.map((stars, composition) => stars.map(({ dark }) =>
    new Texture({ source: backgrounds[composition].source, frame: new Rectangle(...dark) })));
  function createSprite(composition: 0 | 1 | 2, scale: number, originX: number, originY: number) {
    const root = new Container();
    root.position.set(originX, originY);
    root.scale.set(scale);
    const stars = starScenes[composition].map(({ core: [x, y] }, index) => {
      const star = new Sprite(textures[composition][index]);
      star.position.set(x, y);
      star.roundPixels = false;
      star.visible = starCoreSampled(x, y, scale, composition === 1 ? wideFineArt.resolution : 1);
      root.addChild(star);
      return star;
    });
    return { root, stars, composition };
  }
  function update(actor: ReturnType<typeof createSprite>, seconds: number) {
    actor.stars.forEach((star, index) => { star.alpha = starDarkness(seconds, index, actor.composition); });
  }
  return { createSprite, update, destroy() { textures.flat().forEach(texture => texture.destroy(false)); } };
}
