import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { fanFrame } from './fan-timing';

export const fanArt = {
  image: 'art/rooftop-fan.png',
  frames: [[52, 20, 110, 110], [188, 20, 110, 110], [52, 151, 110, 110], [188, 151, 110, 110]],
  alpha: 0.7,
  placements: [
    { face: [186, 358, 9, 10], hub: [189, 362, 3, 3], context: [170, 340, 50, 40] },
    { face: [483, 1072, 13, 15], hub: [487, 1077, 5, 5], context: [460, 1050, 65, 55] },
  ],
} as const;

/** Only the reviewed inner rotor moves; the original background supplies the fixed hub. */
export function createImageFan(source: Texture, backgrounds: readonly Texture[]) {
  source.source.scaleMode = 'nearest';
  const textures = fanArt.frames.map(frame => new Texture({ source: source.source, frame: new Rectangle(...frame) }));
  const hubs = fanArt.placements.map((placement, index) => new Texture({
    source: backgrounds[index].source, frame: new Rectangle(...placement.hub),
  }));
  function createSprite(composition: 0 | 1, scale: number, originX: number, originY: number) {
    const placement = fanArt.placements[composition];
    const root = new Container();
    root.position.set(originX, originY);
    root.scale.set(scale);
    const rotor = new Sprite(textures[0]);
    rotor.position.set(placement.face[0], placement.face[1]);
    rotor.scale.set(placement.face[2] / 110, placement.face[3] / 110);
    rotor.alpha = fanArt.alpha;
    const hub = new Sprite(hubs[composition]);
    // Keep the background's exact source transform and sampling phase, even at half scale.
    hub.position.set(placement.hub[0], placement.hub[1]);
    root.addChild(rotor, hub);
    return { root, rotor };
  }
  function update(fan: ReturnType<typeof createSprite>, seconds: number) {
    fan.rotor.texture = textures[fanFrame(seconds)];
  }
  return { createSprite, update, destroy() { for (const texture of [...textures, ...hubs]) texture.destroy(false); } };
}
