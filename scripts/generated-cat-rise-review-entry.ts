import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { catLegDuration, catPose, type CatPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';

/** Reviewed generated pixels only; every pose is sampled at the same absolute GPU position. */
export async function renderGeneratedCatRiseReview() {
  const names = ['atlas', 'catRestAtlas', 'catWalkAtlas', 'catWalkBack', 'catWalkLift',
    'catGroomAtlas', 'catSettleAtlas', 'catStretchAtlas', 'catStretchMid', 'catTurnAtlas',
    'catLookAtlas', 'catRiseAtlas', 'background'] as const;
  const textures = await Promise.all(names.map(name => Assets.load<Texture>(`/${generatedArt[name]}`)));
  for (const texture of textures) texture.source.scaleMode = 'nearest';
  const [atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn, look, rise, background] = textures;
  const app = new Application();
  await app.init({ width: 3120, height: 1200, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const before = createImageCat(atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn,
    { atlas: look, renderer: app.renderer });
  const after = createImageCat(atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn,
    { atlas: look, renderer: app.renderer }, { atlas: rise, renderer: app.renderer });
  const floor = new Texture({ source: background.source, frame: new Rectangle(260, 362, 240, 150) });
  const snapshot = (factory: typeof after, pose: CatPose, scale: number, phase = 0) => {
    const root = new Container();
    root.addChild(new Sprite(floor));
    const sprite = factory.createSprite();
    factory.update(sprite, { ...pose, x: 120 + phase }, scale * 4, 135 + phase);
    root.addChild(sprite);
    const target = RenderTexture.create({ width: 240, height: 150, resolution: 1 });
    target.source.scaleMode = 'nearest';
    app.renderer.render({ container: root, target, clear: true });
    const pixels = app.renderer.extract.pixels({ target }).pixels;
    root.destroy({ children: true });
    return { target, pixels };
  };
  const comparisons: { scale: number; direction: 1 | -1; phase: number; lookFrame?: 0 | 1; changedPixels: number }[] = [];
  for (const scale of [0.25, 0.375, 0.5, 0.625]) for (const direction of [1, -1] as const) {
    for (const phase of [0, 0.375]) for (const lookFrame of [undefined, 0, 1] as const) {
      const pose: CatPose = { x: 120, direction, frame: 4, breath: 0,
        ...(lookFrame !== undefined ? { lookFrame } : {}) };
      const old = snapshot(before, pose, scale, phase), current = snapshot(after, pose, scale, phase);
      let changedPixels = 0;
      for (let offset = 0; offset < old.pixels.length; offset += 4) {
        if ([0, 1, 2, 3].some(channel => old.pixels[offset + channel] !== current.pixels[offset + channel])) changedPixels++;
      }
      if (changedPixels) throw new Error(`Existing seated/looking pixels changed: ${JSON.stringify({ scale, direction, phase, lookFrame, changedPixels })}`);
      comparisons.push({ scale, direction, phase, lookFrame, changedPixels });
      old.target.destroy(true);
      current.target.destroy(true);
    }
  }
  const offsets = [-0.001, 0.125, 0.375, 0.625, 0.875, 1.125, 2, 2.875, 3.125, 3.375, 3.625, 3.875, 4.001];
  const expected = [undefined, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, undefined];
  const samples: { row: number; scale: number; direction: 1 | -1; riseStart: number;
    panels: { column: number; seconds: number; pose: CatPose }[] }[] = [];
  let row = 0;
  for (const scale of [0.25, 0.375, 0.5, 0.625]) for (const direction of [1, -1] as const) {
    const width = 320, sceneScale = scale * 4;
    const walkDuration = Math.min(18, Math.max(2, width * 0.5 / (32 * sceneScale)));
    const available = 21 - walkDuration;
    const lookDuration = Math.min(6, available - 1.5);
    const lookStart = walkDuration + (available - lookDuration) / 2;
    const riseStart = lookStart - 4.5 + (direction === -1 ? catLegDuration : 0);
    const panels = offsets.map((offset, column) => {
      const seconds = riseStart + offset;
      const pose = catPose(seconds, width, sceneScale);
      if (pose.riseFrame !== expected[column]) throw new Error(`Unexpected rise stage at ${seconds}: ${JSON.stringify(pose)}`);
      const { target } = snapshot(after, pose, scale);
      const panel = new Sprite(target);
      panel.position.set(column * 240, row * 150);
      app.stage.addChild(panel);
      return { column, seconds, pose };
    });
    samples.push({ row, scale, direction, riseStart, panels });
    row++;
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { panels: 104, existingPoseComparisons: comparisons.length, samples, comparisons,
    method: 'Production catPose and createImageCat, neutral/rise1/rise2/rise3/rise4/rise5/stand/rise5/rise4/rise3/rise2/rise1/neutral. Both directions and four production sprite scales. Each 240x150 snapshot is rendered at identical absolute root (120,135), then placed 1:1 into the atlas. Existing neutral/look0/look1 also compared against the factory without rise assets at integer/fractional roots. No original artwork drawn.' };
}
