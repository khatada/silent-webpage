import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createLogicalBackground } from '../src/logical-background';
import { createImageWideBackground } from '../src/image-wide-background';
import { createImageRailPoles } from '../src/image-rail-poles';
import { sceneTrainService, trainServiceState } from '../src/train-service';

export async function renderTrainAlternation() {
  const loaded = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background, generatedArt.atlas, generatedArt.alternateTrain].map(path => Assets.load<Texture>(`/${path}`)));
  loaded.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const wide = createLogicalBackground(loaded[1], generatedArt.wide.width, generatedArt.wide.height, generatedArt.wide.resolution);
  const backgrounds = [loaded[0], wide, loaded[2]];
  const blue = new Texture({ source: loaded[3].source, frame: new Rectangle(...generatedArt.frames.train) });
  const colours = [blue, loaded[4]];
  const app = new Application();
  await app.init({ width: 32, height: 32, resolution: 1, antialias: false, backgroundAlpha: 0, autoStart: false, preference: 'webgl' });
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 1280;
  const context = canvas.getContext('2d')!; document.body.append(canvas);
  const metadata = [];
  let row = 0;
  for (const [name, width, height, css, dpr] of [
    ['normal', 1440, 900, [1440, 900], 1], ['wide', 2560, 1080, [2560, 1080], 1],
    ['portrait', 390, 1025, [390, 1025], 2], ['fractional', 469, 834, [375, 667], 1.25],
  ] as const) {
    const layout = generatedLayout(width, height), service = sceneTrainService(width, height, layout), schedule = service.schedule;
    const background = backgrounds[layout.portrait ? 2 : layout.wide ? 1 : 0];
    const scene = new Container(); let mirrored: ReturnType<typeof createImageWideBackground> | undefined;
    if (layout.wide) { mirrored = createImageWideBackground(background, width, height, layout.scale, layout.originX, layout.originY); scene.addChild(mirrored.root); }
    else { const base = new Sprite(background); base.position.set(layout.originX, layout.originY); base.scale.set(layout.scale); base.roundPixels = true; scene.addChild(base); }
    const target = RenderTexture.create({ width, height, resolution: 1 });
    const render = () => { app.renderer.render({ container: scene, target, clear: true }); const out = app.renderer.extract.pixels(target); if (out.width !== width || out.height !== height) throw new Error('GPU dimensions'); return new Uint8ClampedArray(out.pixels); };
    const initial = render();
    const trains = Array.from({ length: schedule.count }, () => { const art = new Sprite(blue); art.roundPixels = true; art.scale.set(service.scale); art.y = layout.railBottom - 65 * service.scale; scene.addChild(art); return art; });
    let sampled: ReturnType<typeof createImageRailPoles> | undefined;
    const poleTextures: Texture[] = [];
    const poles = layout.wide ? (sampled = createImageRailPoles(app.renderer, background, layout.composition.railPoles,
      layout.scale, layout.originX, layout.originY, width, height)).poles.map(p => p.art) : layout.composition.railPoles.map(frame => {
      const texture = new Texture({ source: background.source, frame: new Rectangle(...frame) }); poleTextures.push(texture);
      const art = new Sprite(texture); art.roundPixels = true;
      art.position.set(Math.round(layout.originX + frame[0] * layout.scale), Math.round(layout.originY + frame[1] * layout.scale));
      art.scale.set(layout.scale); return art;
    });
    scene.addChild(...poles);
    const apply = (seconds: number) => { const states = trainServiceState(schedule, seconds); states.forEach((state, i) => {
      const art = trains[i]; art.visible = state.visible; art.texture = colours[state.colour];
      art.anchor.set(state.direction === 1 ? 0 : 1, 0); art.scale.set(state.direction * service.scale, service.scale); art.x = state.x;
    }); return states; };
    trains.forEach(art => { art.visible = false; }); const poleOnly = render();
    let noTrainPoleChanged = 0; for (let n = 0; n < initial.length; n += 4) if (!initial.subarray(n, n + 4).every((c, k) => c === poleOnly[n + k])) noTrainPoleChanged++;
    const cropWidth = Math.min(240, width), cropHeight = 120;
    const candidates = layout.composition.railPoles.map(([x]) => Math.round(layout.originX + x * layout.scale))
      .filter(x => x > schedule.length / 2 + 10 && x < width - schedule.length / 2 - 10);
    const poleCenter = candidates.sort((a, b) => Math.abs(a - width / 3) - Math.abs(b - width / 3))[0] ?? width / 2;
    const sampleLeft = poleCenter - schedule.length / 2;
    const poleX = Math.max(0, Math.min(width - cropWidth, poleCenter - cropWidth / 2));
    const top = Math.max(0, Math.min(height - cropHeight, Math.floor(layout.railBottom - 65 * service.scale - 28)));
    const copy = (pixels: Uint8ClampedArray, column: number, left: number, targetRow: number) => {
      const crop = new Uint8ClampedArray(cropWidth * cropHeight * 4);
      for (let y = 0; y < cropHeight; y++) crop.set(pixels.subarray(((top + y) * width + left) * 4, ((top + y) * width + left + cropWidth) * 4), y * cropWidth * 4);
      context.putImageData(new ImageData(crop, cropWidth, cropHeight), column * 256, targetRow * 140);
    };
    copy(poleOnly, 0, poleX, row);
    const poleSamples = [];
    for (const [column, batch, index] of [[1, 0, 0], [2, 0, 1], [3, 1, 0], [4, 1, 1]]) {
      if (index >= schedule.count) throw new Error('Expected two-train sample');
      const left = sampleLeft;
      const age = batch === 0 ? (left + schedule.length) / schedule.speed : (width - left) / schedule.speed;
      const seconds = batch * schedule.period - schedule.phase + index * schedule.startGap + age;
      const states = apply(seconds); const pixels = render(); copy(pixels, column, poleX, row);
      let changed = 0; let minX: number = width, minY: number = height, maxX = -1, maxY = -1;
      for (let n = 0; n < pixels.length; n += 4) if (!pixels.subarray(n, n + 4).every((c, k) => c === poleOnly[n + k])) {
        changed++; const p = n / 4, x = p % width, y = Math.floor(p / width);
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      poleSamples.push({ column, seconds, states, changed, changedBounds: [minX, minY, maxX, maxY] });
    }
    row++;
    const next = schedule.period - schedule.phase, exit = next - schedule.clearance;
    const times = [exit - 0.1, exit + 0.1, next - 0.1, next + 0.1, next + schedule.length / schedule.speed + 0.1];
    const events = times.map((seconds, column) => { const states = apply(seconds); copy(render(), column, width - cropWidth, row); return { column, seconds, states }; });
    metadata.push({ name, native: [width, height], css, dpr, composition: layout.portrait ? 'portrait' : layout.wide ? 'wide' : 'normal',
      scale: layout.scale, trainScale: service.scale, schedule, noTrainPoleChanged, crop: { width: cropWidth, height: cropHeight, poleX, top }, poleSamples, events });
    row++;
    scene.destroy({ children: true }); target.destroy(true); sampled?.destroy(); mirrored?.destroy(); poleTextures.forEach(t => t.destroy(false));
  }
  const mirror = [];
  for (const [colour, texture] of colours.entries()) {
    const target = RenderTexture.create({ width: 320, height: 80, resolution: 1 });
    const art = new Sprite(texture); art.roundPixels = true; art.position.set(28, 5);
    const frames = [];
    for (const direction of [1, -1]) {
      art.anchor.set(direction === 1 ? 0 : 1, 0); art.scale.set(direction, 1);
      app.renderer.render({ container: art, target, clear: true }); const pixels = app.renderer.extract.pixels(target); frames.push(new Uint8ClampedArray(pixels.pixels));
      context.putImageData(new ImageData(new Uint8ClampedArray(pixels.pixels), 320, 80), colour * 640 + (direction === 1 ? 0 : 320), 1120);
    }
    let difference = 0;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 320; x++) for (let c = 0; c < 4; c++) if (frames[0][(y * 320 + x) * 4 + c] !== frames[1][(y * 320 + 319 - x) * 4 + c]) difference++;
    mirror.push({ colour, rgbaChannelDifferencesFromHorizontalReverse: difference }); art.destroy(); target.destroy(true);
  }
  blue.destroy(false); wide.destroy(false); app.destroy(); canvas.dataset.ready = 'true';
  return { metadata, mirror, rows: 'Each case: background/blue-right/copper-right/blue-left/copper-left; then last-exit-before/clear-after/gap-end-before/reverse-partial/reverse-full. Bottom: native-scale blue pair and copper pair.',
    method: 'Production sceneTrainService/trainServiceState used directly; sprite texture/anchor/scale mirror follows scene code. Complete native GPU viewport extracted once per sample; integer context crops copied 1:1. Fractional DPR case uses actual pixelViewport-derived native dimensions, not screenshot emulation.' };
}
