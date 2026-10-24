import { Application, Assets, Rectangle, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createWindowCover } from '../src/image-window-cover';
import { nativeReviewTransform } from './native-review-transform';
import { windowReviewBackground } from './window-review-background';
import { windowBrightness } from '../src/animation';
import { createImageResident, residentArt } from '../src/image-resident';
import { residentFrame } from '../src/resident-timing';

/** Compare original and three production poses beneath each actual window's light cycle. */
export async function renderGeneratedResidentReview(scales: readonly number[] = [0.5, 1, 4]) {
  const compositions = [generatedArt, generatedArt.portrait];
  const [source, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${residentArt.image}`),
    ...compositions.map(composition => Assets.load<Texture>(`/${composition.background}`)),
  ]);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const resident = createImageResident(source);
  const app = new Application();
  await app.init({ width: 1536, height: 192 * scales.length * 2, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  compositions.forEach((composition, compositionIndex) => {
    const placement = residentArt.placements[compositionIndex];
    const window = composition.windows[placement.window];
    const [x, y, w, h] = window;
    const context = [x - 8, y - 8, w + 16, h + 16] as const;
    const background = backgrounds[compositionIndex];
    const backgroundCrop = windowReviewBackground(app, background);
    const wall = new Texture({ source: background.source, frame: new Rectangle(...composition.darkWall) });
    const lightPhase = 5 + placement.window * 11, lightPeriod = 29 + placement.window * 7;
    const lights = [2 - lightPhase, 0.45 - lightPhase, lightPeriod * 0.57 + 2 - lightPhase];
    [-1, 0, 1, 2].forEach((pose, poseColumn) => {
      scales.forEach((scale, scaleIndex) => {
        lights.forEach((lightSeconds, lightIndex) => {
          const column = poseColumn * 3 + lightIndex, row = compositionIndex * scales.length + scaleIndex;
          const panelX = column * 128 + 8, panelY = row * 192 + 24;
          const { originX: rootX, originY: rootY, contextX, contextY } =
            nativeReviewTransform(panelX, panelY, context, scale);
          const surrounding = backgroundCrop(context, scale, rootX, rootY);
          app.stage.addChild(surrounding);
          const seconds = [0, 9.5, 12][Math.max(0, pose)] - placement.offset;
          const brightness = windowBrightness(lightSeconds, lightPhase, lightPeriod);
          if (pose >= 0) {
            const sprite = resident.createSprite(window, compositionIndex as 0 | 1, scale, rootX, rootY);
            resident.update(sprite, seconds, compositionIndex as 0 | 1);
            sprite.alpha = brightness;
            app.stage.addChild(sprite);
          }
          const cover = createWindowCover(wall, window, scale, rootX, rootY);
          cover.alpha = 0.92 * (1 - brightness);
          app.stage.addChild(cover);
          samples.push({ composition: compositionIndex, index: placement.window, window, context, scale,
            pose, actualFrame: pose < 0 ? null : residentFrame(seconds, placement.offset), seconds,
            lightSeconds, lightPhase, lightPeriod, alpha: cover.alpha, rootX, rootY, contextX, contextY, row, column, panel: [panelX, panelY, 128, 192] });
        });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1536, height: 192 * scales.length * 2, samples,
    rows: ['normal', 'portrait'].flatMap(name => scales.map(scale => `${name}-${scale}x`)),
    columns: ['original-on', 'original-mid', 'original-off', 'upright-on', 'upright-mid', 'upright-off',
      'slight-on', 'slight-mid', 'slight-off', 'deeper-on', 'deeper-mid', 'deeper-off'] };
}

export async function renderGeneratedResidentHalfScaleReview() {
  return renderGeneratedResidentReview([0.5]);
}
