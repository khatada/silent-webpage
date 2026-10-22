import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { curtainFrame } from '../src/curtain-timing';
import { windowBrightness } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCurtain, curtainArt } from '../src/image-curtain';

/** Each column uses production crop, scale, fixed top, frame timing and existing dark cover. */
export async function renderGeneratedCurtainReview() {
  const compositions = [generatedArt, generatedArt.portrait];
  const [source, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${curtainArt.image}`),
    ...compositions.map(composition => Assets.load<Texture>(`/${composition.background}`)),
  ]);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const curtain = createImageCurtain(source);
  const app = new Application();
  await app.init({ width: 1152, height: 768, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  compositions.forEach((composition, compositionIndex) => {
    const index = compositionIndex ? curtainArt.portraitWindow : curtainArt.normalWindow;
    const window = composition.windows[index];
    const [x, y, w, h] = window;
    const context = [x - 8, y - 8, w + 16, h + 16] as const;
    const background = backgrounds[compositionIndex];
    const contextTexture = new Texture({ source: background.source, frame: new Rectangle(...context) });
    const wall = new Texture({ source: background.source, frame: new Rectangle(...composition.darkWall) });
    [0, 4.5, 6.5].forEach((seconds, pose) => {
      [1, 4].forEach((scale, scaleIndex) => {
        [2, 0.45, 20].forEach((lightSeconds, lightIndex) => {
          const column = pose * 3 + lightIndex;
          const row = compositionIndex * 2 + scaleIndex;
          const panelX = column * 128 + 8, panelY = row * 192 + 24;
          const rootX = panelX - context[0] * scale, rootY = panelY - context[1] * scale;
          const surrounding = new Sprite(contextTexture);
          surrounding.position.set(panelX, panelY);
          surrounding.scale.set(scale);
          app.stage.addChild(surrounding);
          const sprite = curtain.createSprite(window, scale, rootX, rootY);
          curtain.update(sprite, seconds);
          app.stage.addChild(sprite);
          const cover = new Sprite(wall);
          cover.position.set(rootX + x * scale, rootY + y * scale);
          cover.width = w * scale;
          cover.height = h * scale;
          cover.alpha = 0.92 * (1 - windowBrightness(lightSeconds, 0, 29));
          app.stage.addChild(cover);
          samples.push({ composition: composition.background, index, window, context, pose: curtainFrame(seconds),
            seconds, lightSeconds, alpha: cover.alpha, scale, row, column,
            normalization: h / curtainArt.height, spriteX: sprite.x, spriteY: sprite.y });
        });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1152, height: 768, samples,
    rows: ['normal-native', 'normal-4x', 'portrait-native', 'portrait-4x'],
    columns: ['pose0-on', 'pose0-mid', 'pose0-off', 'pose2-on', 'pose2-mid', 'pose2-off',
      'pose1-on', 'pose1-mid', 'pose1-off'] };
}
