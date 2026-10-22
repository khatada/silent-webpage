import { Rectangle, Sprite, Texture } from 'pixi.js';
import { residentFrame } from './resident-timing';

export const residentArt = {
  image: 'art/window-resident.png',
  frames: [[29, 20, 44, 64], [116, 20, 44, 64], [201, 20, 44, 64]],
  placements: [
    { window: 1, height: 5, offset: 0 },
    { window: 0, height: 6, offset: 7 },
  ],
} as const;

/** A common waist and baseline preserve the generated bend without resizing the body. */
export function createImageResident(source: Texture) {
  source.source.scaleMode = 'nearest';
  const textures = residentArt.frames.map(frame => new Texture({ source: source.source, frame: new Rectangle(...frame) }));
  function createSprite(window: readonly number[], composition: 0 | 1, scale: number, originX: number, originY: number) {
    const [x, y, width, height] = window;
    const placement = residentArt.placements[composition];
    const sprite = new Sprite(textures[0]);
    sprite.anchor.set(8 / 44, 63 / 64);
    sprite.position.set(originX + (x + (width - 2) / 2) * scale, originY + (y + height - 1) * scale);
    sprite.scale.set(placement.height / 64 * scale);
    return sprite;
  }
  function update(sprite: Sprite, seconds: number, composition: 0 | 1) {
    sprite.texture = textures[residentFrame(seconds, residentArt.placements[composition].offset)];
  }
  return { createSprite, update, destroy() { for (const texture of textures) texture.destroy(false); } };
}
