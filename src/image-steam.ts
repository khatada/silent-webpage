import { Rectangle, Sprite, Texture } from 'pixi.js';
import { steamState } from './steam-timing';

export const steamArt = {
  image: 'art/cup-steam.png',
  frames: [[28, 18, 72, 96], [156, 18, 72, 96], [284, 18, 72, 96],
    [28, 138, 72, 96], [156, 138, 72, 96], [284, 138, 72, 96]],
  placements: [
    { emitter: [123, 406], height: 16, safe: [117, 390, 12, 16], context: [108, 382, 36, 48] },
    { emitter: [184, 1197], height: 64 / 3, safe: [176, 1175, 16, 22], context: [164, 1165, 44, 56] },
  ],
} as const;

/** Common generated frame size and baseline retain the original growth and dissipation. */
export function createImageSteam(source: Texture) {
  source.source.scaleMode = 'nearest';
  const textures = steamArt.frames.map(frame => new Texture({ source: source.source, frame: new Rectangle(...frame) }));
  function createSprite(composition: 0 | 1, scale: number, originX: number, originY: number) {
    const placement = steamArt.placements[composition];
    const sprite = new Sprite(textures[0]);
    sprite.anchor.set(0.5, 1);
    sprite.position.set(originX + placement.emitter[0] * scale, originY + placement.emitter[1] * scale);
    sprite.scale.set(placement.height / 96 * scale);
    return sprite;
  }
  function update(sprite: Sprite, seconds: number) {
    const state = steamState(seconds);
    sprite.texture = textures[state.frame];
    sprite.alpha = state.alpha;
  }
  return { createSprite, update, destroy() { for (const texture of textures) texture.destroy(false); } };
}
