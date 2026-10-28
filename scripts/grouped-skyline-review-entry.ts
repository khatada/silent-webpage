import { Application, Assets, Container, RenderTexture, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { wideFineArt } from '../src/wide-fine-art';
import { createLogicalBackground } from '../src/logical-background';
import { createImageSkylineLights } from '../src/image-skyline-lights';
import { createImageWideBackground } from '../src/image-wide-background';
import { skylineLightCycle } from '../src/skyline-light-timing';

async function render(scale: number) {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background, generatedArt.portrait.background]
    .map(path => Assets.load<Texture>(`/${path}`)));
  sources[1] = createLogicalBackground(sources[1], wideFineArt.width, wideFineArt.height, 2);
  sources.forEach(source => { source.source.scaleMode = 'nearest'; });
  const app = new Application();
  await app.init({ width: 32, height: 32, antialias: false, autoStart: false, preference: 'webgl' });
  const width = Math.ceil(wideFineArt.width * scale), height = Math.ceil(wideFineArt.height * scale);
  const target = RenderTexture.create({ width, height, resolution: 1, antialias: false });
  const backdrop = createImageWideBackground(sources[1], width, height, scale, 0, 0);
  const scene = new Container(); scene.addChild(backdrop.root);
  const factory = createImageSkylineLights(sources);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = wideFineArt.skylineGroups.length * 128;
  const ctx = canvas.getContext('2d')!; document.body.append(canvas);
  const samples = [];
  for (const [index, { lit: [x, y] }] of wideFineArt.skylineGroups.entries()) {
    const left = Math.max(0, Math.floor((x - 8) * scale)), top = Math.max(0, Math.floor((y - 8) * scale));
    const w = Math.min(width, Math.ceil((x + 9) * scale)) - left, h = Math.min(height, Math.ceil((y + 9) * scale)) - top;
    const cycle = skylineLightCycle(wideFineArt.skylineCores.length + index, 1, 1);
    const times = [cycle.delay, cycle.delay + cycle.fade / 2, cycle.delay + (cycle.fade + cycle.offDuration) / 2];
    const actor = factory.createSprite(1, scale, 0, 0); actor.windows.forEach(window => { window.visible = false; });
    actor.groups.forEach((group, i) => { group.visible = i === index; }); scene.addChild(actor.root);
    let reference: Uint8ClampedArray | undefined;
    const states = [];
    for (let state = 0; state < 4; state++) {
      factory.update(actor, state ? times[state - 1] : 0);
      app.renderer.render({ container: scene, target, clear: true });
      const whole = app.renderer.extract.pixels(target);
      if (whole.width !== width || whole.height !== height) throw new Error('Unexpected extraction size');
      const pixels = new Uint8ClampedArray(w * h * 4);
      for (let row = 0; row < h; row++) {
        const start = ((top + row) * width + left) * 4;
        pixels.set(whole.pixels.subarray(start, start + w * 4), row * w * 4);
      }
      ctx.putImageData(new ImageData(pixels, w, h), state * 128, index * 128);
      let changed = 0, outside = 0;
      if (!reference) reference = pixels.slice();
      else for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === reference[i] && pixels[i + 1] === reference[i + 1] && pixels[i + 2] === reference[i + 2] && pixels[i + 3] === reference[i + 3]) continue;
        changed++;
        const px = left + i / 4 % w + 0.5, py = top + Math.floor(i / 4 / w) + 0.5;
        if (px < x * scale || px >= (x + 1) * scale || py < y * scale || py >= (y + 1) * scale) outside++;
      }
      states.push({ state, changed, outside, alpha: actor.groups[index].alpha });
    }
    samples.push({ index, lit: [x, y, 1, 1], sampled: actor.groups[index].children.map(child => child.visible), states });
    scene.removeChild(actor.root); actor.root.destroy({ children: true });
  }
  canvas.dataset.ready = 'true'; factory.destroy(); backdrop.root.destroy({ children: true }); backdrop.destroy(); target.destroy(true); app.destroy();
  return { scale, width: canvas.width, height: canvas.height, samples };
}
export const half = () => render(0.5);
export const one = () => render(1);
export const two = () => render(2);
export const four = () => render(4);
