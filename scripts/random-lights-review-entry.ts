import { createLogicalBackground } from '../src/logical-background';
import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageSkylineLights, skylineLightScenes } from '../src/image-skyline-lights';
import { createImageStars, starScenes } from '../src/image-stars';
import { skylineLightCycle } from '../src/skyline-light-timing';
import { starCycle } from '../src/star-timing';

/** Representative timing QA only: generated contexts and unchanged production compositors. */
export async function renderRandomLightsReview() {
  const backgrounds = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  backgrounds[1] = createLogicalBackground(backgrounds[1], generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const windows = createImageSkylineLights(backgrounds), stars = createImageStars(backgrounds);
  const width = 640, height = 672, panelWidth = 128, panelHeight = 112, scale = 4;
  const app = new Application();
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30',
    preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  for (const composition of [0, 1, 2] as const) for (const kind of ['window', 'star'] as const) {
    const row = composition * 2 + (kind === 'star' ? 1 : 0);
    const core = kind === 'window' ? skylineLightScenes[composition][0].lit : starScenes[composition][0].core;
    const context = [core[0] - 8, core[1] - 8, core[2] + 16, core[3] + 16] as const;
    const windowEvent = skylineLightCycle(0, composition, 1), nextWindow = skylineLightCycle(0, composition, 2);
    const starEvent = starCycle(0, composition, 1), nextStar = starCycle(0, composition, 2);
    const seconds = kind === 'window'
      ? [undefined, windowEvent.delay, windowEvent.delay + windowEvent.fade / 2,
        windowEvent.delay + windowEvent.fade, nextWindow.delay]
      : [undefined, -starEvent.phase, starEvent.peak / 2 - starEvent.phase,
        starEvent.peak - starEvent.phase, -nextStar.phase];
    let reference: Uint8ClampedArray | Uint8Array | undefined;
    const poses = seconds.map((seconds, column) => {
      const root = new Container();
      const background = new Sprite(new Texture({ source: backgrounds[composition].source,
        frame: new Rectangle(...context) }));
      background.position.set(16, 12); background.scale.set(scale); root.addChild(background);
      let alpha = 0;
      if (seconds !== undefined) {
        const originX = 16 - context[0] * scale, originY = 12 - context[1] * scale;
        if (kind === 'window') {
          const actor = windows.createSprite(composition, scale, originX, originY);
          windows.update(actor, seconds);
          actor.windows.forEach((sprite, index) => { sprite.visible = index === 0; });
          alpha = actor.windows[0].alpha; root.addChild(actor.root);
        } else {
          const actor = stars.createSprite(composition, scale, originX, originY);
          stars.update(actor, seconds);
          actor.stars.forEach((sprite, index) => { sprite.visible = index === 0; });
          alpha = actor.stars[0].alpha; root.addChild(actor.root);
        }
      }
      const snapshot = RenderTexture.create({ width: panelWidth, height: panelHeight, resolution: 1 });
      snapshot.source.scaleMode = 'nearest';
      app.renderer.render({ container: root, target: snapshot, clear: true });
      const { pixels } = app.renderer.extract.pixels({ target: snapshot });
      let changedPixels = 0, outsideCoreChangedPixels = 0;
      if (reference) {
        for (let y = 0; y < panelHeight; y++) for (let x = 0; x < panelWidth; x++) {
          const offset = (y * panelWidth + x) * 4;
          if (![0, 1, 2, 3].some(channel => reference![offset + channel] !== pixels[offset + channel])) continue;
          changedPixels++;
          if (x < 48 || x >= 48 + core[2] * scale || y < 44 || y >= 44 + core[3] * scale) outsideCoreChangedPixels++;
        }
      } else reference = pixels;
      if (outsideCoreChangedPixels || ((column === 1 || column === 4) && changedPixels)) {
        throw new Error(`Core composition changed outside intended area: ${JSON.stringify({ composition, kind, column, changedPixels, outsideCoreChangedPixels })}`);
      }
      const panel = new Sprite(snapshot); panel.position.set(column * panelWidth, row * panelHeight);
      app.stage.addChild(panel); root.destroy({ children: true });
      return { column, seconds: seconds ?? null, alpha, changedPixels, outsideCoreChangedPixels };
    });
    samples.push({ row, composition, kind, selectedIndex: 0, scale, core, context,
      event: kind === 'window' ? windowEvent : starEvent, nextEvent: kind === 'window' ? nextWindow : nextStar, poses });
  }
  app.renderer.render(app.stage); app.canvas.dataset.ready = 'true';
  return { width, height, samples,
    panelOrder: ['original', 'event1-bright', 'event1-mid-fade-or-half-peak', 'event1-dim', 'event2-bright'],
    method: 'Representative window0/star0 of each composition at scale4. Same absolute render/extract first, then unmodified1:1 snapshot placement. Backgrounds and compositors are existing reviewed generated artwork. Original/bright/next-bright RGBA equal and all other changes restricted to intended core.',
    limitations: 'Six representative actors only. Timing coverage for all windows/stars is in unit tests; this image does not show every interval or every actor.' };
}
