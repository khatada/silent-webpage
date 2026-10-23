import { Sprite, type Texture } from 'pixi.js';
import { travelPosition } from './animation';
import type { generatedLayout } from './generated-layout';

type Layout = ReturnType<typeof generatedLayout>;
export const upperCloudArt = { alpha: 0.12, relativeScale: 0.2,
  // Measured alpha bounds of the reviewed cloud crop, with exclusive right/bottom.
  alphaBounds: [0, 2, 228, 70], margin: 4 } as const;

/** Keep a real upper lane; crowded skies omit this optional cloud instead of squeezing it. */
export function upperCloudGeometry(layout: Pick<Layout, 'cloudScale' | 'cloudY' | 'skyBottom'>, relativeScale: number = upperCloudArt.relativeScale) {
  const scale = layout.cloudScale * relativeScale;
  const lowerTop = layout.cloudY + upperCloudArt.alphaBounds[1] * layout.cloudScale;
  const minimumY = Math.ceil(upperCloudArt.margin - upperCloudArt.alphaBounds[1] * scale);
  const maximumY = Math.floor(Math.min(layout.skyBottom, lowerTop) - upperCloudArt.margin
    - upperCloudArt.alphaBounds[3] * scale);
  const y = Math.max(minimumY, Math.min(Math.floor(layout.skyBottom * 0.13), maximumY));
  return { scale, y, width: 235 * scale, top: y + 2 * scale, bottom: y + 70 * scale,
    lowerTop, visible: scale > 0 && maximumY >= minimumY };
}

/** Reuse the generated cloud texture unchanged; the scene owns time, resize and disposal. */
export function createImageUpperCloud(texture: Texture) {
  function createSprite(layout: Layout, options: { relativeScale?: number; alpha?: number } = {}) {
    const geometry = upperCloudGeometry(layout, options.relativeScale);
    const sprite = new Sprite(texture);
    sprite.scale.set(geometry.scale);
    sprite.y = geometry.y;
    sprite.alpha = options.alpha ?? upperCloudArt.alpha;
    sprite.visible = geometry.visible;
    return sprite;
  }
  function update(sprite: Sprite, seconds: number, width: number, scale: number) {
    sprite.x = travelPosition(seconds, width, sprite.width, scale * 0.35, width * 0.65);
  }
  return { createSprite, update };
}
