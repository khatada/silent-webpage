import { Application, Assets, Rectangle, Texture } from 'pixi.js';
import { windowBrightness } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createWindowCover } from '../src/image-window-cover';
import { nativeReviewTransform } from './native-review-transform';
import { windowReviewBackground } from './window-review-background';

/** Existing generated background crops, with the production sampling phase and fade. */
async function render(compositionIndex: 0 | 1 | 2) {
  const composition = [generatedArt, generatedArt.wide, generatedArt.portrait][compositionIndex];
  const background = await Assets.load<Texture>(`/${composition.background}`);
  background.source.scaleMode = 'nearest';
  const darkWall = new Texture({ source: background.source, frame: new Rectangle(...composition.darkWall) });
  const app = new Application();
  const width = 1152, height = 1536, panelSize = 128, padding = 8;
  await app.init({ width, height, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const states = [
    { name: 'original', seconds: 2 }, { name: 'on', seconds: 2 },
    { name: 'half', seconds: 0.45 }, { name: 'off', seconds: 20 },
  ].map(state => ({ ...state, alpha: 0.92 * (1 - windowBrightness(state.seconds, 0, 29)) }));
  const backgroundCrop = windowReviewBackground(app, background);
  const samples: unknown[] = [];
  [0.5, 1, 4].forEach((scale, scaleIndex) => {
    composition.windows.forEach((window, column) => {
      const [x, y, w, h] = window;
      const context = [x - padding, y - padding, w + padding * 2, h + padding * 2] as const;
      states.forEach((state, stateIndex) => {
        const row = scaleIndex * states.length + stateIndex;
        const panelX = column * panelSize, panelY = row * panelSize;
        const transform = nativeReviewTransform(panelX + 8, panelY + 8, context, scale);
        const surrounding = backgroundCrop(context, scale, transform.originX, transform.originY);
        app.stage.addChild(surrounding);
        const cover = createWindowCover(darkWall, window, scale, transform.originX, transform.originY);
        cover.alpha = state.name === 'original' ? 0 : state.alpha;
        app.stage.addChild(cover);
        samples.push({ row, column, window, state: state.name, seconds: state.seconds, alpha: cover.alpha,
          context, ...transform, scale });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width, height, panelSize, composition: composition.background, states, samples };
}
export const renderNormalWindows = () => render(0);
export const renderWideWindows = () => render(1);
export const renderPortraitWindows = () => render(2);
