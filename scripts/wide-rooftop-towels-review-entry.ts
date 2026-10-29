import { Application, Assets, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createLogicalBackground } from '../src/logical-background';
import { createImageWideBackground } from '../src/image-wide-background';
import { createImageLaundry, laundryArt, wideLaundryGeometry } from '../src/image-laundry';

/** Generated backgrounds and production cloth factory; native pixels are copied without repainting. */
export async function renderWideRooftopTowels() {
  const [loadedBackground, cloth] = await Promise.all([
    Assets.load<Texture>(`/${generatedArt.wide.background}`), Assets.load<Texture>(`/${laundryArt.image}`),
  ]);
  const background = createLogicalBackground(loadedBackground, generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  const app = new Application();
  await app.init({ width: 32, height: 32, resolution: 1, antialias: false,
    backgroundAlpha: 0, preference: 'webgl', autoStart: false });
  const laundry = createImageLaundry(cloth);
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 624;
  const context = canvas.getContext('2d')!;
  document.body.append(canvas);
  const samples = [];
  for (const [row, [width, height]] of [[800, 600], [2560, 1080], [3200, 1080]].entries()) {
    const layout = generatedLayout(width, height);
    const geometry = wideLaundryGeometry(width, height, layout.scale, layout.originX, layout.originY);
    if (!geometry.visible) throw new Error('The target cloth must be fully visible.');
    const backdrop = createImageWideBackground(background, width, height, layout.scale, layout.originX, layout.originY);
    const whole = RenderTexture.create({ width, height, resolution: 1 });
    app.renderer.render({ container: backdrop.root, target: whole, clear: true });
    const scene = new Container(); scene.addChild(new Sprite(whole));
    const target = RenderTexture.create({ width, height, resolution: 1 });
    const actor = laundry.createSprite(2, layout.scale, layout.originX, layout.originY);
    const [sourceX, sourceY, sourceWidth, sourceHeight] = laundryArt.placements[2].context;
    const left = layout.originX + sourceX * layout.scale;
    const top = layout.originY + sourceY * layout.scale;
    const cropWidth = sourceWidth * layout.scale, cropHeight = sourceHeight * layout.scale;
    let original: Uint8ClampedArray | undefined;
    let firstFold: Uint8ClampedArray | undefined;
    for (const [column, seconds] of [undefined, 0, 4, 6.5, 9].entries()) {
      if (seconds !== undefined) { laundry.update(actor, seconds); scene.addChild(actor.root); }
      app.renderer.render({ container: scene, target, clear: true });
      const pixels = app.renderer.extract.pixels(target);
      if (pixels.width !== width || pixels.height !== height) throw new Error('GPU output dimensions differ.');
      const crop = new Uint8ClampedArray(cropWidth * cropHeight * 4);
      for (let y = 0; y < cropHeight; y++) {
        const start = ((top + y) * width + left) * 4;
        crop.set(pixels.pixels.subarray(start, start + cropWidth * 4), y * cropWidth * 4);
      }
      context.putImageData(new ImageData(crop, cropWidth, cropHeight), column * 256 + 8, row * 208 + 8);
      let outside = 0, changed = 0;
      if (!original) original = crop;
      else for (let pixel = 0; pixel < cropWidth * cropHeight; pixel++) {
        const offset = pixel * 4;
        if (!crop.subarray(offset, offset + 4).every((channel, index) => channel === original![offset + index])) {
          changed++;
          const x = left + pixel % cropWidth, y = top + Math.floor(pixel / cropWidth);
          if (x < Math.floor(geometry.x) || x >= Math.ceil(geometry.x + geometry.width)
            || y < Math.floor(geometry.y) || y >= Math.ceil(geometry.y + geometry.height)) outside++;
        }
      }
      const foldRows = Math.max(0, Math.floor(geometry.y + 10 * actor.root.scale.y) - top);
      const fold = crop.slice(0, foldRows * cropWidth * 4);
      const fixedFold = seconds === undefined || firstFold === undefined || fold.every((channel, index) => channel === firstFold![index]);
      if (seconds !== undefined && !firstFold) firstFold = fold;
      if (outside || !fixedFold) throw new Error('Cloth changes pixels beyond its area or supporting fold.');
      samples.push({ row, column, seconds: seconds ?? null, viewport: [width, height],
        layout: { scale: layout.scale, originX: layout.originX, originY: layout.originY },
        geometry, context: [left, top, cropWidth, cropHeight], changed, outside, fixedFold });
      if (seconds !== undefined) scene.removeChild(actor.root);
    }
    actor.root.destroy({ children: true }); scene.destroy({ children: true });
    whole.destroy(true); target.destroy(true); backdrop.root.destroy({ children: true }); backdrop.destroy();
  }
  laundry.destroy(); background.destroy(false); app.destroy();
  canvas.dataset.ready = 'true';
  return { width: canvas.width, height: canvas.height, samples,
    columns: ['background', 'straight', 'right', 'near-center', 'left'],
    method: 'Complete production wide viewport rendered to native RT; integer crops copied at 1:1 into atlas.' };
}
