import { Application, Assets, Rectangle, Texture } from 'pixi.js';
import { curtainFrame } from '../src/curtain-timing';
import { windowBrightness } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createWindowCover } from '../src/image-window-cover';
import { nativeReviewTransform } from './native-review-transform';
import { windowReviewBackground } from './window-review-background';
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
  await app.init({ width: 1536, height: 1152, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  compositions.forEach((composition, compositionIndex) => {
    const index = compositionIndex ? curtainArt.portraitWindow : curtainArt.normalWindow;
    const window = composition.windows[index];
    const [x, y, w, h] = window;
    const context = [x - 8, y - 8, w + 16, h + 16] as const;
    const background = backgrounds[compositionIndex];
    const backgroundCrop = windowReviewBackground(app, background);
    const wall = new Texture({ source: background.source, frame: new Rectangle(...composition.darkWall) });
    [0, 0, 4.5, 6.5].forEach((seconds, poseColumn) => {
      const pose = poseColumn - 1;
      [0.5, 1, 4].forEach((scale, scaleIndex) => {
        [2, 0.45, 20].forEach((lightSeconds, lightIndex) => {
          const column = poseColumn * 3 + lightIndex;
          const row = compositionIndex * 3 + scaleIndex;
          const panelX = column * 128 + 8, panelY = row * 192 + 24;
          const { originX: rootX, originY: rootY, contextX, contextY } =
            nativeReviewTransform(panelX, panelY, context, scale);
          const surrounding = backgroundCrop(context, scale, rootX, rootY);
          app.stage.addChild(surrounding);
          const sprite = curtain.createSprite(window, scale, rootX, rootY);
          curtain.update(sprite, seconds);
          if (pose >= 0) app.stage.addChild(sprite);
          const cover = createWindowCover(wall, window, scale, rootX, rootY);
          cover.alpha = 0.92 * (1 - windowBrightness(lightSeconds, 0, 29));
          app.stage.addChild(cover);
          samples.push({ composition: composition.background, index, window, context, pose: pose < 0 ? -1 : curtainFrame(seconds),
            seconds, lightSeconds, alpha: cover.alpha, scale, row, column,
            rootX, rootY, contextX, contextY, panel: [panelX, panelY, 128, 192],
            normalization: h / curtainArt.height, spriteX: sprite.x, spriteY: sprite.y });
        });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1536, height: 1152, samples,
    rows: ['normal-half', 'normal-native', 'normal-4x', 'portrait-half', 'portrait-native', 'portrait-4x'],
    columns: ['original-on', 'original-mid', 'original-off', 'pose0-on', 'pose0-mid', 'pose0-off', 'pose2-on', 'pose2-mid', 'pose2-off',
      'pose1-on', 'pose1-mid', 'pose1-off'] };
}
