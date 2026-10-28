import { Application, Assets, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createLogicalBackground } from '../src/logical-background';
import { createImageWideBackground } from '../src/image-wide-background';
import { createImageCat } from '../src/image-cat';
import { catPose, type CatPose } from '../src/animation';
import { walkingFrame, walkingPhaseOffsets, walkingSourceStride, walkingStride } from '../src/walking-timing';

/** Production cat factory and the complete compact viewport; no artwork is drawn here. */
async function render(direction: 1 | -1) {
  const width = 800, height = 600, layout = generatedLayout(width, height);
  if (!layout.wide) throw new Error('The support case must use the wide background.');
  const paths = [generatedArt.atlas, generatedArt.catRestAtlas, generatedArt.catWalkAtlas,
    generatedArt.catWalkBack, generatedArt.catWalkLift, generatedArt.catGroomAtlas,
    generatedArt.catSettleAtlas, generatedArt.catStretchAtlas, generatedArt.catStretchMid,
    generatedArt.catTurnAtlas, generatedArt.catLookAtlas, generatedArt.catRiseAtlas, generatedArt.wide.background];
  const images = await Promise.all(paths.map(path => Assets.load<Texture>(`/${path}`)));
  images.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const background = createLogicalBackground(images[12], generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  const app = new Application();
  await app.init({ width: 32, height: 32, resolution: 1, antialias: false, backgroundAlpha: 0,
    preference: 'webgl', autoStart: false });
  const cat = createImageCat(images[0], images[1], images[2], images[3], images[4], images[5], images[6],
    images[7], images[8], images[9], { atlas: images[10], renderer: app.renderer },
    { atlas: images[11], renderer: app.renderer });
  const backdrop = createImageWideBackground(background, width, height, layout.scale, layout.originX, layout.originY);
  const whole = RenderTexture.create({ width, height, resolution: 1 });
  whole.source.scaleMode = 'nearest';
  app.renderer.render({ container: backdrop.root, target: whole, clear: true });
  const composite = RenderTexture.create({ width, height, resolution: 1 });
  const isolated = RenderTexture.create({ width, height, resolution: 1 });
  const scene = new Container(), catLayer = new Container();
  scene.addChild(new Sprite(whole));
  const sprite = cat.createSprite();
  const actorScale = layout.motionScale * layout.composition.actorScale;
  const base: CatPose = { x: 200, direction, frame: 4, breath: 0 };
  const poses: { name: string; pose: CatPose | null; phase?: number }[] = [{ name: 'background', pose: null }];
  for (let phase = 0; phase < 8; phase++) {
    const stride = walkingStride(actorScale);
    const offset = direction * stride * walkingPhaseOffsets[phase] / walkingSourceStride;
    const x = offset + Math.round((base.x - offset) / stride) * stride;
    poses.push({ name: `walk-${phase}`, pose: { ...base, x, frame: 0 }, phase });
  }
  poses.push({ name: 'neutral', pose: base });
  for (const lookFrame of [0, 1] as const) poses.push({ name: `look-${lookFrame}`, pose: { ...base, lookFrame } });
  for (const groomFrame of [0, 1, 2, 3, 4, 5] as const)
    poses.push({ name: `groom-${groomFrame}`, pose: { ...base, frame: 5, groomFrame } });
  for (const settleFrame of [0, 1, 2, 3, 4, 5] as const)
    poses.push({ name: `settle-${settleFrame}`, pose: { ...base, frame: 7, settleFrame } });
  for (const stretchFrame of [0, 1, 2, 3, 4, 5] as const)
    poses.push({ name: `stretch-${stretchFrame}`, pose: { ...base, frame: 8, stretchFrame } });
  for (const turnFrame of [0, 1, 2, 3, 4, 5, 6, 7] as const)
    poses.push({ name: `turn-${turnFrame}`, pose: { ...base, frame: 8, turnFrame } });
  for (const riseFrame of [1, 2, 3, 4, 5, 6] as const)
    poses.push({ name: `rise-${riseFrame}`, pose: { ...base, riseFrame } });
  const left = 80, top = layout.catY - 100, panelWidth = 260, panelHeight = 128;
  const canvas = document.createElement('canvas');
  canvas.width = panelWidth * 4; canvas.height = Math.ceil(poses.length / 4) * panelHeight;
  const context = canvas.getContext('2d')!;
  document.body.append(canvas);
  const samples = [];
  for (const [index, item] of poses.entries()) {
    let opaqueBounds: number[] | null = null;
    if (item.pose) {
      cat.update(sprite, item.pose, actorScale, layout.catY);
      if (item.phase !== undefined && walkingFrame(item.pose.x, direction, actorScale) !== item.phase)
        throw new Error('Walking world position did not select the requested phase.');
      catLayer.addChild(sprite);
      app.renderer.render({ container: catLayer, target: isolated, clear: true });
      const alpha = app.renderer.extract.pixels(isolated).pixels;
      let minX = width, maxX = -1, minY = height, maxY = -1;
      for (let pixel = 0; pixel < width * height; pixel++) if (alpha[pixel * 4 + 3] >= 128) {
        const x = pixel % width, y = Math.floor(pixel / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      opaqueBounds = [minX, minY, maxX, maxY];
      if (minX < left || maxX >= left + panelWidth || minY < top || maxY >= top + panelHeight)
        throw new Error('Support context clips the cat silhouette.');
      scene.addChild(sprite);
    }
    app.renderer.render({ container: scene, target: composite, clear: true });
    const wholePixels = app.renderer.extract.pixels(composite).pixels;
    const crop = new Uint8ClampedArray(panelWidth * panelHeight * 4);
    for (let row = 0; row < panelHeight; row++) {
      const start = ((top + row) * width + left) * 4;
      crop.set(wholePixels.subarray(start, start + panelWidth * 4), row * panelWidth * 4);
    }
    context.putImageData(new ImageData(crop, panelWidth, panelHeight), index % 4 * panelWidth,
      Math.floor(index / 4) * panelHeight);
    samples.push({ index, name: item.name, pose: item.pose, phase: item.phase ?? null,
      opaqueBounds, footY: layout.catY });
    if (item.pose) scene.removeChild(sprite);
  }
  canvas.dataset.ready = 'true';
  sprite.destroy(); catLayer.destroy(); scene.destroy({ children: true });
  cat.destroy(); whole.destroy(true); composite.destroy(true); isolated.destroy(true);
  backdrop.root.destroy({ children: true }); backdrop.destroy(); background.destroy(false); app.destroy();
  return { width: canvas.width, height: canvas.height, direction, viewport: [width, height],
    layout: { scale: layout.scale, motionScale: layout.motionScale, actorScale, originX: layout.originX,
      originY: layout.originY, catY: layout.catY, floor: layout.composition.floor },
    context: [left, top, panelWidth, panelHeight], columns: 4, samples,
    walkingPosition: 'Nearest worldX to200 selecting each production distance phase; other poses use x200. Snapshots retain absolute world position and the same background context.',
    extraCoverage: 'Rise1..6 included even though compact catPose has no rising interval; background-only panel included. Settling/stretching/turning endpoint frames included.',
    legacyFallbacks: 'Old rest-atlas grooming1/2 without groomFrame are unreachable in the current production catPose and not separately rendered.',
    actualCompactRiseUsed: Array.from({ length: 720 }, (_, i) => catPose(i / 10, width, actorScale)).some(pose => pose.riseFrame !== undefined) };
}

export const supportRight = () => render(1);
export const supportLeft = () => render(-1);
