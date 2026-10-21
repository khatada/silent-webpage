import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { windowBrightness } from '../src/animation';
import { generatedArt } from '../src/generated-art';

/** Inspect only existing generated pixels and the production window fade; no original artwork is drawn. */
export async function renderGeneratedWindowReview() {
  const compositions = [generatedArt, generatedArt.wide, generatedArt.portrait];
  const backgrounds = await Promise.all(compositions.map(composition =>
    Assets.load<Texture>(`/${composition.background}`)));
  for (const texture of backgrounds) texture.source.scaleMode = 'nearest';
  const app = new Application();
  const size = 1152;
  const panelSize = 128;
  const scale = 4;
  const padding = 8;
  await app.init({ width: size, height: size, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const states = [
    { name: 'original', seconds: 2 },
    { name: 'half', seconds: 0.45 },
    { name: 'off', seconds: 20 },
  ].map(state => ({ ...state, alpha: 0.92 * (1 - windowBrightness(state.seconds, 0, 29)) }));
  const samples: unknown[] = [];
  compositions.forEach((composition, compositionIndex) => {
    const background = backgrounds[compositionIndex];
    const darkWall = new Texture({ source: background.source, frame: new Rectangle(...composition.darkWall) });
    composition.windows.forEach((window, column) => {
      const [x, y, w, h] = window;
      const context = [x - padding, y - padding, w + padding * 2, h + padding * 2] as const;
      const contextTexture = new Texture({ source: background.source, frame: new Rectangle(...context) });
      states.forEach((state, stateIndex) => {
        const row = compositionIndex * states.length + stateIndex;
        const panelX = column * panelSize;
        const panelY = row * panelSize;
        const contextX = panelX + (panelSize - context[2] * scale) / 2;
        const contextY = panelY + (panelSize - context[3] * scale) / 2;
        const surrounding = new Sprite(contextTexture);
        surrounding.roundPixels = true;
        surrounding.position.set(contextX, contextY);
        surrounding.scale.set(scale);
        app.stage.addChild(surrounding);
        const cover = new Sprite(darkWall);
        cover.roundPixels = true;
        cover.position.set(contextX + padding * scale, contextY + padding * scale);
        cover.width = w * scale;
        cover.height = h * scale;
        cover.alpha = state.alpha;
        app.stage.addChild(cover);
        samples.push({ row, column, background: composition.background, window, darkWall: composition.darkWall,
          state: state.name, seconds: state.seconds, alpha: state.alpha, phase: 0, period: 29,
          context, contextX, contextY, scale });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: size, height: size, columns: 9, rows: 9, scale, contextPadding: padding,
    rowOrder: ['normal-original', 'normal-half', 'normal-off', 'wide-original', 'wide-half', 'wide-off',
      'portrait-original', 'portrait-half', 'portrait-off'], states, samples };
}
