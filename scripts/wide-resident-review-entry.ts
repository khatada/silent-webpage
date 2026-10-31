import { Application, Assets, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createLogicalBackground } from '../src/logical-background';
import { createImageWideBackground } from '../src/image-wide-background';
import { createImageRoomLights, roomLightAreas } from '../src/image-room-lights';
import { createImageResident, residentArt } from '../src/image-resident';

/** Production textures and factories rendered at the same absolute viewport position. */
export async function renderWideResidentReview() {
  const [normal, rawWide, portrait, source] = await Promise.all([
    Assets.load<Texture>(`/${generatedArt.background}`), Assets.load<Texture>(`/${generatedArt.wide.background}`),
    Assets.load<Texture>(`/${generatedArt.portrait.background}`), Assets.load<Texture>(`/${residentArt.image}`),
  ]);
  const wide = createLogicalBackground(rawWide, generatedArt.wide.width, generatedArt.wide.height, generatedArt.wide.resolution);
  const app = new Application();
  await app.init({ width: 32, height: 32, resolution: 1, antialias: false, preference: 'webgl', autoStart: false });
  const room = createImageRoomLights([normal, wide, portrait]);
  const person = createImageResident(source);
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 624;
  const ctx = canvas.getContext('2d')!; document.body.append(canvas);
  const samples = [];
  for (const [row, [width, height]] of [[800, 600], [2560, 1080], [3200, 1080]].entries()) {
    const layout = generatedLayout(width, height), scale = layout.scale;
    if (!layout.wide || scale < 2) throw new Error('Unexpected layout');
    const bg = createImageWideBackground(wide, width, height, scale, layout.originX, layout.originY);
    const whole = RenderTexture.create({ width, height, resolution: 1 });
    app.renderer.render({ container: bg.root, target: whole, clear: true });
    const scene = new Container(); scene.addChild(new Sprite(whole));
    const target = RenderTexture.create({ width, height, resolution: 1 });
    const area = roomLightAreas[1], glass = area.glass, win = generatedArt.wide.windows[area.windowIndex];
    const personSprite = person.createSprite(glass, 2, scale, layout.originX, layout.originY);
    const cover = room.createCover(1, area.windowIndex, win, wide, scale, layout.originX, layout.originY);
    const [cx, cy, cw, ch] = [248, 164, 18, 17];
    const left = layout.originX + cx * scale, top = layout.originY + cy * scale;
    const cropWidth = cw * scale, cropHeight = ch * scale;
    const base = new Map<number, Uint8ClampedArray>();
    for (const [column, [seconds, brightness, hasPerson]] of [[0, 1, 0], [0, 1, 1], [7, 1, 1], [9, 1, 1], [0, 0, 0], [9, 0, 1]].entries()) {
      if (hasPerson) { person.update(personSprite, seconds, 2); personSprite.alpha = brightness; scene.addChild(personSprite); }
      cover.alpha = 0.92 * (1 - brightness); scene.addChild(cover);
      app.renderer.render({ container: scene, target, clear: true });
      const pixels = app.renderer.extract.pixels(target);
      if (pixels.width !== width || pixels.height !== height) throw new Error('Unexpected GPU dimensions');
      const crop = new Uint8ClampedArray(cropWidth * cropHeight * 4);
      for (let y = 0; y < cropHeight; y++) {
        const start = ((top + y) * width + left) * 4;
        crop.set(pixels.pixels.subarray(start, start + cropWidth * 4), y * cropWidth * 4);
      }
      ctx.putImageData(new ImageData(crop, cropWidth, cropHeight), column * 256 + 8, row * 208 + 8);
      if (!hasPerson) base.set(brightness, crop);
      let outside = 0, changed = 0;
      if (hasPerson) for (let i = 0; i < cropWidth * cropHeight; i++) {
        const offset = i * 4, original = base.get(brightness)!;
        if (!crop.subarray(offset, offset + 4).every((v, k) => v === original[offset + k])) {
          changed++;
          const x = left + i % cropWidth, y = top + Math.floor(i / cropWidth);
          if (x < layout.originX + glass[0] * scale || x >= layout.originX + (glass[0] + glass[2]) * scale
            || y < layout.originY + glass[1] * scale || y >= layout.originY + (glass[1] + glass[3]) * scale) outside++;
        }
      }
      if (outside || (brightness === 0 && changed)) throw new Error('Resident escaped glass or remained visible when dark.');
      samples.push({ row, column, viewport: [width, height], scale, seconds, brightness, hasPerson: !!hasPerson, changed, outside });
      scene.removeChild(cover); if (hasPerson) scene.removeChild(personSprite);
    }
    personSprite.destroy(); cover.destroy({ children: true }); scene.destroy({ children: true });
    whole.destroy(true); target.destroy(true); bg.root.destroy({ children: true }); bg.destroy();
  }
  room.destroy(); person.destroy(); wide.destroy(false); app.destroy(); canvas.dataset.ready = 'true';
  return { width: canvas.width, height: canvas.height, samples, method: 'Full viewport native RT; pixels cropped 1:1.' };
}
