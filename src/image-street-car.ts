import { wideFineArt } from './wide-fine-art';
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from './generated-art';
import { streetCarTiming } from './street-car-timing';

type Frame = readonly [number, number, number, number];
type Point = readonly [number, number];
export const streetCarScenes = [
  { route: [[309, 374], [309, 359], [314, 339], [315, 327]], width: 6,
    occlusion: [[300, 360, 30, 24], [305, 315, 4, 47]], context: [285, 300, 55, 100], reviewScale: 3 },
  wideFineArt.streetCar,
  { route: [[409, 1094], [409, 1066], [414, 1008], [409, 974], [399, 948]], width: 10,
    occlusion: [[393, 1074, 36, 32], [412, 978, 5, 99], [408, 972, 12, 12]],
    context: [375, 922, 70, 190], reviewScale: 2 },
] as const;

/** All images are generated art or unchanged background crops, shared by scene and review. */
export function createImageStreetCar(source: Texture, backgrounds: readonly Texture[]) {
  const crops: Texture[] = [];
  const crop = (image: Texture, rect: Frame) => {
    const texture = new Texture({ source: image.source, frame: new Rectangle(...rect) });
    crops.push(texture);
    return texture;
  };
  source.source.scaleMode = 'nearest';
  const carTexture = crop(source, generatedArt.streetCar.frame);
  const masks = streetCarScenes.map((scene, index) => scene.occlusion.map(rect => ({ rect, texture: crop(backgrounds[index], rect) })));
  const routes = streetCarScenes.map(scene => {
    const route: readonly Point[] = scene.route;
    const lengths = route.slice(1).map((point, i) => Math.hypot(point[0] - route[i][0], point[1] - route[i][1]));
    return { route, lengths, total: lengths.reduce((a, b) => a + b, 0) };
  });
  function createSprite(index: number, scale: number, originX: number, originY: number) {
    const root = new Container();
    root.position.set(originX, originY);
    root.scale.set(scale);
    const car = new Sprite(carTexture);
    car.anchor.set(0.5, 1);
    car.roundPixels = true;
    root.addChild(car);
    for (const { rect, texture } of masks[index]) {
      const mask = new Sprite(texture);
      mask.position.set(rect[0], rect[1]);
      // Preserve the original background's sampling phase, including half-scale layouts.
      mask.roundPixels = false;
      root.addChild(mask);
    }
    return { root, car, index };
  }
  function update(actor: ReturnType<typeof createSprite>, seconds: number) {
    const timing = streetCarTiming(seconds);
    const scene = streetCarScenes[actor.index];
    const { route, lengths, total } = routes[actor.index];
    // Interpolate by road distance rather than giving short segments equal travel time.
    let remaining = timing.distance * total;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) remaining -= lengths[segment++];
    const fraction = Math.min(1, remaining / lengths[segment]);
    const from = route[segment], to = route[segment + 1];
    const x = from[0] + (to[0] - from[0]) * fraction;
    const y = from[1] + (to[1] - from[1]) * fraction;
    const desiredWidth = 1 + (scene.width - 1) * (1 - timing.distance);
    const nativeWidth = Math.max(1, Math.round(desiredWidth * actor.root.scale.x));
    const width = nativeWidth / actor.root.scale.x;
    actor.car.position.set(x, y);
    actor.car.scale.set(width / carTexture.width);
    actor.car.alpha = timing.alpha;
    actor.car.visible = timing.visible;
    return { ...timing, x, y, width, desiredWidth, nativeWidth, height: actor.car.height, seconds };
  }
  return { createSprite, update, destroy() { for (const texture of crops) texture.destroy(false); } };
}
