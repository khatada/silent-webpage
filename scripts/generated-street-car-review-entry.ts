import { createLogicalBackground } from '../src/logical-background';
import { Application, Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageStreetCar, streetCarScenes } from '../src/image-street-car';
import { streetCarInitialOffset, streetCarTravel } from '../src/street-car-timing';

/** The same car sprite and foreground restoration as production, sampled without timers. */
export async function renderGeneratedStreetCarReview() {
  const backgrounds = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  backgrounds[1] = createLogicalBackground(backgrounds[1], generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  const source = await Assets.load<Texture>(`/${generatedArt.streetCar.image}`);
  for (const image of [...backgrounds, source]) image.source.scaleMode = 'nearest';
  const car = createImageStreetCar(source, backgrounds);
  const app = new Application();
  await app.init({ width: 1500, height: 1200, resolution: 1, antialias: false,
    background: '#101326', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  streetCarScenes.forEach((scene, row) => {
    const [x, y, width, height] = scene.context;
    const texture = new Texture({ source: backgrounds[row].source, frame: new Rectangle(x, y, width, height) });
    [0.1, 0.25, 0.45, 0.65, 0.9].forEach((progress, column) => {
      const panel = new Container();
      panel.position.set(column * 300 + (300 - width * scene.reviewScale) / 2, row * 400);
      const context = new Sprite(texture);
      context.scale.set(scene.reviewScale);
      panel.addChild(context);
      const actor = car.createSprite(row, scene.reviewScale, -x * scene.reviewScale, -y * scene.reviewScale);
      panel.addChild(actor.root);
      app.stage.addChild(panel);
      const seconds = progress * streetCarTravel - streetCarInitialOffset;
      samples.push({ scene: row, context: scene.context, scale: scene.reviewScale,
        ...car.update(actor, seconds) });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1500, height: 1200, samples };
}
