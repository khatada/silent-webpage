import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { generatedLayout } from './generated-layout';

export const windsockArt = { image: 'art/rooftop-windsock.png', support: [12, 77, 23, 93],
  cloth: [[35, 74, 93, 64], [154, 74, 92, 64], [272, 74, 88, 64], [387, 74, 90, 64], [504, 74, 91, 64]],
  order: [0, 1, 2, 1, 0, 3, 4, 3], holds: [0.6, 0.35, 0.55, 0.35, 0.6, 0.35, 0.55, 0.35] } as const;

export function windsockFrame(seconds: number) {
  const period = windsockArt.holds.reduce((sum, hold) => sum + hold, 0);
  let phase = ((seconds % period) + period) % period;
  for (let index = 0; index < windsockArt.holds.length; index++) {
    if (phase < windsockArt.holds[index]) return windsockArt.order[index];
    phase -= windsockArt.holds[index];
  }
  return 0;
}

export function windsockGeometry(width: number, height: number, layout: ReturnType<typeof generatedLayout>, physicalScale: number) {
  const density = Number.isFinite(physicalScale) && physicalScale > 0 ? physicalScale : 1;
  const physicalHeight = Math.min(90, Math.max(60, 22.5 * layout.scale * density));
  const scale = physicalHeight / density / 93;
  const x = Math.round(layout.originX + 430 * layout.scale);
  const y = Math.round(layout.originY + 190 * layout.scale);
  const left = x - 9 * scale, right = x + 107 * scale, top = y - 96 * scale;
  return { x, y, scale, left, right, top, physicalHeight,
    visible: layout.wide && layout.scale >= 2 && [width, height, x, y, scale].every(Number.isFinite)
      && left >= 0 && right <= width && top >= 0 && y <= height && y < layout.catY };
}

/** One generated support stays fixed; only registered crops of the generated cloth move. */
export function createImageWindsock(source: Texture) {
  source.source.scaleMode = 'nearest';
  const support = new Texture({ source: source.source, frame: new Rectangle(...windsockArt.support) });
  const cloth = windsockArt.cloth.map(frame => new Texture({ source: source.source, frame: new Rectangle(...frame) }));
  function createSprite(geometry: ReturnType<typeof windsockGeometry>) {
    const root = new Container(); root.position.set(geometry.x, geometry.y); root.scale.set(geometry.scale);
    root.visible = geometry.visible;
    const pole = new Sprite(support); pole.position.set(-9, -93);
    const body = new Sprite(cloth[0]); body.position.set(14, -96);
    root.addChild(body, pole);
    return { root, pole, body };
  }
  function update(actor: ReturnType<typeof createSprite>, seconds: number) { actor.body.texture = cloth[windsockFrame(seconds)]; }
  return { createSprite, update, destroy() { support.destroy(false); cloth.forEach(texture => texture.destroy(false)); } };
}
