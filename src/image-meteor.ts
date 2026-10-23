import { Rectangle, Sprite, Texture } from 'pixi.js';
import { meteorState } from './meteor-timing';

export const meteorArt = { image: 'art/meteor.png', frame: [125, 83, 230, 62], slope: 0.25 } as const;

/** Bounds include the entire generated tail throughout its short diagonal flight. */
export function meteorGeometry(width: number, skyBottom: number) {
  const spriteWidth = Math.round(Math.max(14, Math.min(28, width * 0.05)));
  const spriteHeight = spriteWidth * meteorArt.frame[3] / meteorArt.frame[2];
  const x = Math.round(width * 0.22);
  const y = Math.round(Math.max(4, skyBottom * 0.18));
  const dx = Math.max(0, Math.min(Math.round(width * 0.18), 72, width - 4 - x - spriteWidth,
    Math.floor((skyBottom - 4 - y - spriteHeight) / meteorArt.slope)));
  const visible = y + spriteHeight <= skyBottom - 4 && dx >= 14;
  return { x, y, dx, dy: dx * meteorArt.slope, width: spriteWidth, height: spriteHeight, visible };
}

export function createImageMeteor(source: Texture) {
  source.source.scaleMode = 'nearest';
  const texture = new Texture({ source: source.source, frame: new Rectangle(...meteorArt.frame) });
  function createSprite(width: number, skyBottom: number) {
    const sprite = new Sprite(texture);
    const geometry = meteorGeometry(width, skyBottom);
    sprite.scale.set(geometry.width / meteorArt.frame[2]);
    sprite.roundPixels = true;
    sprite.alpha = 0;
    return sprite;
  }
  function update(sprite: Sprite, seconds: number, width: number, skyBottom: number) {
    const geometry = meteorGeometry(width, skyBottom);
    const state = meteorState(seconds);
    sprite.position.set(Math.round(geometry.x + geometry.dx * state.progress),
      Math.round(geometry.y + geometry.dy * state.progress));
    sprite.alpha = geometry.visible ? state.alpha : 0;
  }
  return { createSprite, update, destroy() { texture.destroy(false); } };
}
