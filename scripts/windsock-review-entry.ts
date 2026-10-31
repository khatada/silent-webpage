import { Application, Assets, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createLogicalBackground } from '../src/logical-background';
import { createImageWideBackground } from '../src/image-wide-background';
import { createImageWindsock, windsockArt, windsockGeometry } from '../src/image-windsock';

export async function renderWindsockReview() {
  const [loaded, art] = await Promise.all([Assets.load<Texture>(`/${generatedArt.wide.background}`), Assets.load<Texture>(`/${windsockArt.image}`)]);
  const background = createLogicalBackground(loaded, generatedArt.wide.width, generatedArt.wide.height, generatedArt.wide.resolution);
  const app = new Application(); await app.init({ width: 32, height: 32, resolution: 1, antialias: false, backgroundAlpha: 0, preference: 'webgl', autoStart: false });
  const factory = createImageWindsock(art), canvas = document.createElement('canvas');
  canvas.width = 960; canvas.height = 420; const ctx = canvas.getContext('2d')!; document.body.append(canvas);
  const samples = [];
  for (const [row, [width, height, density]] of [[2560, 1080, 1], [800, 600, 1], [844, 390, 2]].entries()) {
    const layout = generatedLayout(width, height), g = windsockGeometry(width, height, layout, density);
    const backdrop = createImageWideBackground(background, width, height, layout.scale, layout.originX, layout.originY);
    const whole = RenderTexture.create({ width, height, resolution: 1 }); app.renderer.render({ container: backdrop.root, target: whole, clear: true });
    const scene = new Container(); scene.addChild(new Sprite(whole));
    const actor = factory.createSprite(g), target = RenderTexture.create({ width, height, resolution: 1 });
    const left = Math.floor(g.left) - 8, top = Math.floor(g.top) - 8;
    let original: Uint8ClampedArray | undefined, first: Uint8ClampedArray | undefined;
    for (const [column, seconds] of [undefined, 0.1, 0.7, 1.1, 2.6, 3].entries()) {
      if (seconds !== undefined) { factory.update(actor, seconds); scene.addChild(actor.root); }
      app.renderer.render({ container: scene, target, clear: true }); const pixels = app.renderer.extract.pixels(target);
      if (pixels.width !== width || pixels.height !== height) throw new Error('Wrong extract dimensions');
      const crop = new Uint8ClampedArray(150 * 130 * 4);
      for (let y = 0; y < 130; y++) { const index = ((top + y) * width + left) * 4; crop.set(pixels.pixels.subarray(index, index + 150 * 4), y * 150 * 4); }
      ctx.putImageData(new ImageData(crop, 150, 130), column * 160, row * 140);
      let outside = 0, supportChanges = 0, changed = 0;
      if (!original) original = crop;
      else for (let y = 0; y < 130; y++) for (let x = 0; x < 150; x++) {
        const i = (y * 150 + x) * 4;
        if (crop.subarray(i, i + 4).some((v, j) => v !== original![i + j])) {
          changed++;
          if (x + left < Math.floor(g.left) || x + left >= Math.ceil(g.right) || y + top < Math.floor(g.top) || y + top >= Math.ceil(g.y)) outside++;
        }
        if (first && x + left < Math.floor(g.x + 14 * g.scale) && crop.subarray(i, i + 4).some((v, j) => v !== first![i + j])) supportChanges++;
      }
      if (seconds !== undefined && !first) first = crop;
      if (outside || supportChanges) throw new Error('Windsock escaped crop or moved support');
      samples.push({ row, column, seconds, viewport: [width, height], density, geometry: g, crop: [left, top, 150, 130], changed, outside, supportChanges });
      if (seconds !== undefined) scene.removeChild(actor.root);
    }
    actor.root.destroy({ children: true }); scene.destroy({ children: true }); whole.destroy(true); target.destroy(true); backdrop.root.destroy({ children: true }); backdrop.destroy();
  }
  factory.destroy(); background.destroy(false); app.destroy(); canvas.dataset.ready = 'true'; return { samples, method: 'Production generated background and windsock factory; whole native GPU pixels then integer1:1 crops. Density2 row is renderer pixels, physical display is2x.' };
}
