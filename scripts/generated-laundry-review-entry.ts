import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageLaundry, laundryArt } from '../src/image-laundry';
import { laundryFrame } from '../src/laundry-timing';
import { nativeReviewTransform } from './native-review-transform';

/** Shared production factory and background sampling origin, including half-scale. */
export async function renderGeneratedLaundryReview() {
  const compositions = [generatedArt, generatedArt.portrait];
  const [source, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${laundryArt.image}`),
    ...compositions.map(composition => Assets.load<Texture>(`/${composition.background}`)),
  ]);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const laundry = createImageLaundry(source);
  const app = new Application();
  await app.init({ width: 1120, height: 1248, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  compositions.forEach((composition, compositionIndex) => {
    const index = compositionIndex as 0 | 1;
    const placement = laundryArt.placements[index];
    const context = placement.context;
    const texture = new Texture({ source: backgrounds[index].source, frame: new Rectangle(...context) });
    [0.5, 1, 4].forEach((scale, scaleIndex) => {
      [undefined, 0, 4, 6.5, 9].forEach((seconds, column) => {
        const row = compositionIndex * 3 + scaleIndex;
        const panelX = column * 224 + 12, panelY = row * 208 + 8;
        const { originX, originY, contextX, contextY } = nativeReviewTransform(panelX, panelY, context, scale);
        const background = new Sprite(texture);
        background.position.set(contextX, contextY);
        background.scale.set(scale);
        app.stage.addChild(background);
        if (seconds !== undefined) {
          const actor = laundry.createSprite(index, scale, originX, originY);
          laundry.update(actor, seconds - index * 5);
          app.stage.addChild(actor.root);
        }
        samples.push({ composition: composition.background, compositionIndex, scale, row, column,
          context, panelX, panelY, originX, originY, contextX, contextY, width: context[2] * scale, height: context[3] * scale,
          seconds, frame: seconds === undefined ? null : laundryFrame(seconds), placement });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1120, height: 1248, samples,
    rows: ['normal-half', 'normal-native', 'normal-4x', 'portrait-half', 'portrait-native', 'portrait-4x'],
    columns: ['background', 'straight', 'right', 'near-center', 'left'] };
}
