import { Rectangle, Sprite, Texture } from 'pixi.js';
import { curtainFrame } from './curtain-timing';

export const curtainArt = {
  image: 'art/window-curtain.png',
  frames: [[46, 18, 84, 208], [159, 18, 84, 208], [277, 18, 84, 208]],
  topWidth: 58,
  height: 208,
  normalWindow: 8,
  portraitWindow: 6,
} as const;

/** Fixed top, shared scale; only reviewed image crops change, never the window frame. */
export function createImageCurtain(source: Texture) {
  source.source.scaleMode = 'nearest';
  const textures = curtainArt.frames.map(frame => new Texture({ source: source.source,
    frame: new Rectangle(...frame) }));
  function createSprite(window: readonly number[], scale: number, originX: number, originY: number) {
    const [x, y, width, height] = window;
    const normalization = height / curtainArt.height;
    const sprite = new Sprite(textures[0]);
    sprite.position.set(Math.round(originX + (x + (width - curtainArt.topWidth * normalization) / 2) * scale),
      Math.round(originY + y * scale));
    sprite.scale.set(normalization * scale);
    sprite.roundPixels = true;
    return sprite;
  }
  function update(sprite: Sprite, seconds: number) { sprite.texture = textures[curtainFrame(seconds)]; }
  return { createSprite, update, destroy() { for (const texture of textures) texture.destroy(false); } };
}
