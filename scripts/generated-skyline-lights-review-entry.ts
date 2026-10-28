import { createLogicalBackground } from '../src/logical-background';
import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageSkylineLights, skylineLightScenes } from '../src/image-skyline-lights';
import { skylineLightCycle } from '../src/skyline-light-timing';
import { nativeReviewTransform } from './native-review-transform';

async function render(composition: 0 | 1 | 2) {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  sources[1] = createLogicalBackground(sources[1], generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  sources.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const factory = createImageSkylineLights(sources);
  const app = new Application();
  const width = 448, height = 1728, columnWidth = 112, rowHeight = 96;
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30',
    preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  skylineLightScenes[composition].forEach(({ lit, dark }, windowIndex) => {
    const context = [lit[0] - 8, lit[1] - 8, lit[2] + 16, lit[3] + 16] as const;
    const { delay, fade } = skylineLightCycle(windowIndex, composition);
    [0.5, 1, 4].forEach((scale, scaleIndex) => {
      const row = windowIndex * 3 + scaleIndex;
      [undefined, 0, delay + fade / 2, delay + fade].forEach((seconds, column) => {
        const panelX = column * columnWidth + 12, panelY = row * rowHeight + 8;
        const transform = nativeReviewTransform(panelX, panelY, context, scale);
        const background = new Sprite(new Texture({ source: sources[composition].source,
          frame: new Rectangle(...context) }));
        background.position.set(transform.contextX, transform.contextY);
        background.scale.set(scale); app.stage.addChild(background);
        let alpha = 0;
        if (seconds !== undefined) {
          const actor = factory.createSprite(composition, scale, transform.originX, transform.originY);
          factory.update(actor, seconds);
          actor.windows.forEach((window, index) => { window.visible = index === windowIndex; });
          alpha = actor.windows[windowIndex].alpha;
          app.stage.addChild(actor.root);
        }
        samples.push({ composition, windowIndex, scale, row, column, columnWidth, rowHeight,
          panelX, panelY, context, lit, dark, ...transform, seconds: seconds ?? null, alpha });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width, height, samples };
}
export const renderNormalSkylineLights = () => render(0);
export const renderWideSkylineLights = () => render(1);
export const renderPortraitSkylineLights = () => render(2);
