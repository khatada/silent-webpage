import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageStars, starScenes } from '../src/image-stars';
import { nativeReviewTransform } from './native-review-transform';

export async function renderStarStrengthReview() {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  sources.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const factory = createImageStars(sources);
  const app = new Application();
  const width = 480, height = 800;
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30',
    preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  [[2, 0], [2, 1], [2, 2], [0, 5], [1, 12]].forEach(([compositionIndex, index], row) => {
    const composition = compositionIndex as 0 | 1 | 2;
    const { core } = starScenes[composition][index];
    const context = [core[0] - 8, core[1] - 8, 17, 17] as const;
    [1, 4].forEach((scale, scaleIndex) => [0, 0.25, 0.45, 0.6, 0.75].forEach((alpha, column) => {
      const panelRow = row * 2 + scaleIndex;
      const transform = nativeReviewTransform(column * 96 + 8, panelRow * 80 + 6, context, scale);
      const background = new Sprite(new Texture({ source: sources[composition].source,
        frame: new Rectangle(...context) }));
      background.position.set(transform.contextX, transform.contextY); background.scale.set(scale); app.stage.addChild(background);
      const actor = factory.createSprite(composition, scale, transform.originX, transform.originY);
      actor.stars.forEach((star, candidate) => { star.visible = candidate === index; star.alpha = alpha; });
      app.stage.addChild(actor.root);
      samples.push({ composition, index, alpha, row: panelRow, scale, column, context });
    }));
  });
  app.renderer.render(app.stage); app.canvas.dataset.ready = 'true';
  return { width, height, samples };
}
