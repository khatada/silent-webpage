import { Rectangle, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';
import type { generatedLayout } from './generated-layout';
import { plantFrame } from './plant-timing';

export const plantArt = { image: 'art/rooftop-plant.png', frameWidth: 80, frameHeight: 112,
  foot: 111, anchorX: 40 } as const;

/** Put one small pot on the clear floor behind the cat; omit unsupported tiny layouts. */
export function plantGeometry(layout: ReturnType<typeof generatedLayout>, width: number, height: number) {
  const scale = layout.scale * layout.composition.actorScale * 0.25;
  const sourceFoot = layout.wide ? 212 : layout.portrait ? 1260 : 430;
  const sourceFloorTop = layout.wide ? 207 : layout.portrait ? 1220 : 418;
  const x = width / 2;
  const footY = layout.originY + sourceFoot * layout.scale;
  const frameWidth = plantArt.frameWidth * scale, frameHeight = plantArt.frameHeight * scale;
  const top = footY - plantArt.foot * scale, bottom = footY + scale;
  const visible = [width, height, scale, x, footY, top, bottom].every(Number.isFinite)
    && scale > 0 && frameHeight >= 20 && frameWidth >= 14
    && x - frameWidth / 2 >= 0 && x + frameWidth / 2 <= width && top >= 0 && bottom <= height
    && footY >= layout.originY + sourceFloorTop * layout.scale && footY < layout.catY;
  return { x, footY, scale, width: frameWidth, height: frameHeight, top, bottom, visible };
}

/** Only reviewed generated pixels are rendered; normalization keeps the pot still at every scale. */
export function createImagePlant(source: Texture, renderer: Renderer) {
  source.source.scaleMode = 'nearest';
  const textures = [0, 1, 2].map(index => {
    const crop = new Texture({ source: source.source,
      frame: new Rectangle(index * plantArt.frameWidth, 0, plantArt.frameWidth, plantArt.frameHeight) });
    const normalized = RenderTexture.create({ width: plantArt.frameWidth, height: plantArt.frameHeight, resolution: 1 });
    normalized.source.scaleMode = 'nearest';
    const sprite = new Sprite(crop);
    sprite.roundPixels = true;
    renderer.render({ container: sprite, target: normalized, clear: true });
    sprite.destroy();
    crop.destroy(false);
    return normalized;
  });
  return {
    createSprite(geometry: ReturnType<typeof plantGeometry>) {
      const sprite = new Sprite(textures[0]);
      sprite.anchor.set(plantArt.anchorX / plantArt.frameWidth, plantArt.foot / plantArt.frameHeight);
      sprite.roundPixels = true;
      sprite.scale.set(geometry.scale);
      sprite.position.set(geometry.x, geometry.footY);
      sprite.visible = geometry.visible;
      return sprite;
    },
    update(sprite: Sprite, seconds: number) { sprite.texture = textures[plantFrame(seconds)]; },
    destroy() { for (const texture of textures) texture.destroy(true); },
  };
}
