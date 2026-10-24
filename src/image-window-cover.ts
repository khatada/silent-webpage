import { Sprite, Texture } from 'pixi.js';

/** Match the background's sampling phase, including odd source coordinates at half scale. */
export function createWindowCover(texture: Texture, window: readonly number[], scale: number,
  originX: number, originY: number) {
  const [x, y, width, height] = window;
  const sprite = new Sprite(texture);
  sprite.position.set(originX + x * scale, originY + y * scale);
  sprite.width = width * scale;
  sprite.height = height * scale;
  sprite.roundPixels = false;
  return sprite;
}
