import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageStars, starScenes } from '../src/image-stars';
import { starCycle } from '../src/star-timing';
import { nativeReviewTransform } from './native-review-transform';

async function render(composition: 0 | 1 | 2, start: number) {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  sources.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const factory = createImageStars(sources);
  const selected = starScenes[composition].slice(start, start + 5);
  const app = new Application();
  const width = 384, rowHeight = 80, columnWidth = 96, height = selected.length * 3 * rowHeight;
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30',
    preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  selected.forEach(({ core, dark }, localIndex) => {
    const starIndex = start + localIndex;
    const context = [core[0] - 8, core[1] - 8, 17, 17] as const;
    const { period, phase } = starCycle(starIndex, composition);
    const bright = (period - phase) % period;
    [0.5, 1, 4].forEach((scale, scaleIndex) => {
      const row = localIndex * 3 + scaleIndex;
      [undefined, bright, bright + period / 4, bright + period / 2].forEach((seconds, column) => {
        const panelX = column * columnWidth + 8, panelY = row * rowHeight + 6;
        const transform = nativeReviewTransform(panelX, panelY, context, scale);
        const background = new Sprite(new Texture({ source: sources[composition].source,
          frame: new Rectangle(...context) }));
        background.position.set(transform.contextX, transform.contextY);
        background.scale.set(scale); app.stage.addChild(background);
        let alpha = 0;
        if (seconds !== undefined) {
          const actor = factory.createSprite(composition, scale, transform.originX, transform.originY);
          factory.update(actor, seconds);
          actor.stars.forEach((star, index) => { star.visible = star.visible && index === starIndex; });
          alpha = actor.stars[starIndex].alpha;
          app.stage.addChild(actor.root);
        }
        samples.push({ composition, starIndex, scale, row, column, columnWidth, rowHeight,
          panelX, panelY, context, core, dark, ...transform, seconds: seconds ?? null, alpha });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width, height, samples };
}
export const renderNormalStars0 = () => render(0, 0);
export const renderNormalStars1 = () => render(0, 5);
export const renderNormalStars2 = () => render(0, 10);
export const renderWideStars0 = () => render(1, 0);
export const renderWideStars1 = () => render(1, 5);
export const renderWideStars2 = () => render(1, 10);
export const renderWideStars3 = () => render(1, 15);
export const renderPortraitStars0 = () => render(2, 0);
export const renderPortraitStars1 = () => render(2, 5);
export const renderPortraitStars2 = () => render(2, 10);
