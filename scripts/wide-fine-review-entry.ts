import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { wideFineArt } from '../src/wide-fine-art';
import { createLogicalBackground } from '../src/logical-background';
import { createImageRoomLights } from '../src/image-room-lights';
import { createImageSkylineLights } from '../src/image-skyline-lights';
import { createImageStars, starCoreSampled } from '../src/image-stars';
import { skylineLightCycle } from '../src/skyline-light-timing';
import { starCycle } from '../src/star-timing';
import { residentialLightCycle } from '../src/city-motion';
import { windowBrightness } from '../src/animation';
import { createImageRailPoles } from '../src/image-rail-poles';
import { createImageWideBackground } from '../src/image-wide-background';

type Kind = 'windows' | 'skyline' | 'stars';
type Rect = readonly [number, number, number, number];
const panel = 128;

/** Actual factories over a full-background native render; snapshots share absolute coordinates. */
async function render(kind: Kind, scale: number) {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  sources[1] = createLogicalBackground(sources[1], wideFineArt.width, wideFineArt.height, wideFineArt.resolution);
  sources.forEach(source => { source.source.scaleMode = 'nearest'; });
  const rooms = createImageRoomLights(sources), skyline = createImageSkylineLights(sources), stars = createImageStars(sources);
  const wall = new Texture({ source: sources[1].source, frame: new Rectangle(...wideFineArt.darkWall) });
  const rects: readonly Rect[] = kind === 'windows' ? wideFineArt.windows
    : kind === 'skyline' ? wideFineArt.skylineCores.map(item => item.lit) : wideFineArt.stars;
  const app = new Application();
  await app.init({ width: 32, height: 32, resolution: 1, antialias: false,
    backgroundAlpha: 0, preference: 'webgl', autoStart: false });
  const width = Math.ceil(wideFineArt.width * scale), height = Math.ceil(wideFineArt.height * scale);
  const backgroundTarget = RenderTexture.create({ width, height, resolution: 1, antialias: false });
  backgroundTarget.source.scaleMode = 'nearest';
  const backdrop = createImageWideBackground(sources[1], width, height, scale, 0, 0);
  app.renderer.render({ container: backdrop.root, target: backgroundTarget, clear: true });
  const target = RenderTexture.create({ width, height, resolution: 1, antialias: false });
  const scene = new Container();
  scene.addChild(new Sprite(backgroundTarget));
  const poleComparisons = [];
  if (kind === 'windows') {
    const original = app.renderer.extract.pixels(backgroundTarget).pixels;
    const factory = createImageRailPoles(app.renderer, sources[1], wideFineArt.railPoles, scale, 0, 0, width, height);
    for (const [index, { art: pole }] of factory.poles.entries()) {
      scene.addChild(pole);
      app.renderer.render({ container: scene, target, clear: true });
      const pixels = app.renderer.extract.pixels(target).pixels;
      let changed = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset] !== original[offset] || pixels[offset + 1] !== original[offset + 1]
          || pixels[offset + 2] !== original[offset + 2] || pixels[offset + 3] !== original[offset + 3]) changed++;
      }
      poleComparisons.push({ index, changed });
      scene.removeChild(pole); pole.destroy();
    }
    factory.destroy();
  }
  const canvas = document.createElement('canvas');
  canvas.width = panel * 4; canvas.height = panel * rects.length;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;
  document.body.append(canvas);
  const samples = [];
  for (const [index, rect] of rects.entries()) {
    const glass = kind === 'windows' && index === wideFineArt.roomLight.windowIndex
      ? [wideFineArt.roomLight.leftGlass, wideFineArt.roomLight.glass] : [rect];
    const minX = Math.min(...glass.map(r => r[0])), minY = Math.min(...glass.map(r => r[1]));
    const maxX = Math.max(...glass.map(r => r[0] + r[2])), maxY = Math.max(...glass.map(r => r[1] + r[3]));
    const left = Math.max(0, Math.floor((minX - 8) * scale)), top = Math.max(0, Math.floor((minY - 8) * scale));
    const frame = new Rectangle(left, top, Math.min(width, Math.ceil((maxX + 8) * scale)) - left,
      Math.min(height, Math.ceil((maxY + 8) * scale)) - top);
    if (frame.width > panel || frame.height > panel) throw new Error('Snapshot exceeds native atlas panel.');
    let times: number[];
    if (kind === 'windows') {
      const cycle = residentialLightCycle(index);
      times = [cycle.period + 2 - cycle.phase, cycle.period + 0.45 - cycle.phase,
        cycle.period * 1.8 - cycle.phase];
    } else if (kind === 'skyline') {
      const { delay, fade, offDuration } = skylineLightCycle(index, 1, 1);
      times = [delay, delay + fade / 2, delay + (fade + offDuration) / 2];
    } else {
      const { phase, peak } = starCycle(index, 1, 1);
      times = [-phase, -phase + peak / 2, -phase + peak];
    }
    let original: Uint8ClampedArray | undefined;
    const states = [];
    for (let state = 0; state < 4; state++) {
      let overlay: Container | undefined;
      let alpha = 0, sampled = true;
      if (state) {
        const seconds = times[state - 1];
        if (!(seconds > 0)) throw new Error('Review times must be positive.');
        if (kind === 'windows') {
          overlay = rooms.createCover(1, index, rect, wall, scale, 0, 0);
          alpha = 0.92 * (1 - windowBrightness(seconds, residentialLightCycle(index).phase,
            residentialLightCycle(index).period));
          overlay.alpha = alpha;
        } else if (kind === 'skyline') {
          const actor = skyline.createSprite(1, scale, 0, 0);
          skyline.update(actor, seconds);
          actor.windows.forEach((item, i) => { item.visible = item.visible && i === index; });
          overlay = actor.root; alpha = actor.windows[index].alpha; sampled = actor.windows[index].visible;
        } else {
          const actor = stars.createSprite(1, scale, 0, 0);
          stars.update(actor, seconds);
          actor.stars.forEach((item, i) => { item.visible = item.visible && i === index; });
          overlay = actor.root; alpha = actor.stars[index].alpha; sampled = actor.stars[index].visible;
        }
        scene.addChild(overlay);
      }
      app.renderer.render({ container: scene, target, clear: true });
      // Texture extraction ignores ExtractOptions.frame: crop the complete native buffer explicitly.
      const whole = app.renderer.extract.pixels(target);
      if (whole.width !== width || whole.height !== height) throw new Error('Unexpected full render dimensions.');
      const pixels = new Uint8ClampedArray(frame.width * frame.height * 4);
      for (let row = 0; row < frame.height; row++) {
        const start = ((top + row) * width + left) * 4;
        pixels.set(whole.pixels.subarray(start, start + frame.width * 4), row * frame.width * 4);
      }
      context.putImageData(new ImageData(pixels, frame.width, frame.height), state * panel, index * panel);
      let changed = 0, outside = 0;
      if (!original) original = pixels.slice();
      else for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset] === original[offset] && pixels[offset + 1] === original[offset + 1]
          && pixels[offset + 2] === original[offset + 2] && pixels[offset + 3] === original[offset + 3]) continue;
        changed++;
        const x = left + (offset / 4) % frame.width + 0.5;
        const y = top + Math.floor(offset / 4 / frame.width) + 0.5;
        if (!glass.some(([gx, gy, gw, gh]) => x >= gx * scale && x < (gx + gw) * scale
          && y >= gy * scale && y < (gy + gh) * scale)) outside++;
      }
      states.push({ state: ['original', 'on', 'mid', 'off'][state], seconds: state ? times[state - 1] : null,
        alpha, sampled, changed, outside });
      if (overlay) { scene.removeChild(overlay); overlay.destroy({ children: true }); }
    }
    samples.push({ index, nativeContext: [left, top, frame.width, frame.height], glass,
      sampledExpected: kind === 'windows' || starCoreSampled(rect[0], rect[1], scale, 2), states });
  }
  canvas.dataset.ready = 'true';
  rooms.destroy(); skyline.destroy(); stars.destroy(); wall.destroy(false);
  backdrop.root.destroy({ children: true }); backdrop.destroy();
  scene.destroy({ children: true }); target.destroy(true); backgroundTarget.destroy(true);
  app.destroy();
  return { kind, scale, origin: [0, 0], width: canvas.width, height: canvas.height, panel,
    stateColumns: ['original', 'on', 'mid', 'off'], poleComparisons, samples };
}

export const windowsHalf = () => render('windows', 0.5);
export const windowsOne = () => render('windows', 1);
export const windowsTwo = () => render('windows', 2);
export const windowsFour = () => render('windows', 4);
export const skylineHalf = () => render('skyline', 0.5);
export const skylineOne = () => render('skyline', 1);
export const skylineTwo = () => render('skyline', 2);
export const skylineFour = () => render('skyline', 4);
export const starsHalf = () => render('stars', 0.5);
export const starsOne = () => render('stars', 1);
export const starsTwo = () => render('stars', 2);
export const starsFour = () => render('stars', 4);
