import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { laundryFrame } from './laundry-timing';

export const laundryArt = {
  image: 'art/roof-towels.png',
  frames: [[25, 49, 96, 80], [159, 49, 96, 80], [293, 49, 96, 80], [428, 49, 96, 80]],
  foldRows: 10,
  sourceHeight: 74,
  anchor: [46, 4],
  placements: [
    { center: [376, 276], height: 10, safe: [367, 275, 18, 12], context: [359, 266, 34, 30] },
    { center: [503, 907], height: 15, safe: [490, 906, 26, 17], context: [478, 892, 50, 44] },
  ],
} as const;

/** Both towels share one scale and anchor. The reviewed first fold stays attached to the cap. */
export function createImageLaundry(source: Texture) {
  source.source.scaleMode = 'nearest';
  const [x, y, width] = laundryArt.frames[0];
  const fold = new Texture({ source: source.source,
    frame: new Rectangle(x, y, width, laundryArt.foldRows) });
  const bodies = laundryArt.frames.map(([x, y, width, height]) => new Texture({ source: source.source,
    frame: new Rectangle(x, y + laundryArt.foldRows, width, height - laundryArt.foldRows) }));
  function createSprite(composition: 0 | 1, scale: number, originX: number, originY: number) {
    const placement = laundryArt.placements[composition];
    const normalization = placement.height / laundryArt.sourceHeight;
    const root = new Container();
    root.position.set(originX + (placement.center[0] - laundryArt.anchor[0] * normalization) * scale,
      originY + (placement.center[1] - laundryArt.anchor[1] * normalization) * scale);
    root.scale.set(normalization * scale);
    const body = new Sprite(bodies[0]);
    body.y = laundryArt.foldRows;
    root.addChild(body, new Sprite(fold));
    return { root, body, composition };
  }
  function update(actor: ReturnType<typeof createSprite>, seconds: number) {
    actor.body.texture = bodies[laundryFrame(seconds, actor.composition)];
  }
  return { createSprite, update, destroy() { fold.destroy(false); bodies.forEach(texture => texture.destroy(false)); } };
}
