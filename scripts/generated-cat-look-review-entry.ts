import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { CatPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';

/** Production factory; reviewed floor crops only, no artwork drawn by code. */
export async function renderGeneratedCatLookReview() {
  const names = ['atlas', 'catRestAtlas', 'catWalkAtlas', 'catWalkBack', 'catWalkLift',
    'catGroomAtlas', 'catSettleAtlas', 'catStretchAtlas', 'catStretchMid', 'catTurnAtlas',
    'catLookAtlas', 'background'] as const;
  const textures = await Promise.all(names.map(name => Assets.load<Texture>(`/${generatedArt[name]}`)));
  for (const texture of textures) texture.source.scaleMode = 'nearest';
  const [atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn, look, background] = textures;
  const app = new Application();
  await app.init({ width: 1000, height: 2400, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const cat = createImageCat(atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn,
    { atlas: look, renderer: app.renderer });
  const floor = new Texture({ source: background.source, frame: new Rectangle(280, 362, 200, 150) });
  const samples: { row: number; scale: number; direction: 1 | -1; phase: number;
    poses: { x: number; footY: number; lookFrame?: 0 | 1 }[] }[] = [];
  const comparisons: { row: number; column: number; bodyChangedPixels: number; endpointChangedPixels: number }[] = [];
  let row = 0;
  for (const scale of [0.25, 0.375, 0.5, 0.625]) {
    for (const direction of [1, -1] as const) {
      for (const phase of [0, 0.375]) {
        const poses = [];
        let reference: Uint8ClampedArray | Uint8Array | undefined;
        for (const [column, lookFrame] of [undefined, 0, 1, 0, undefined].entries()) {
          const root = new Container();
          root.addChild(new Sprite(floor));
          const pose: CatPose = { x: 100 + phase, direction, frame: 4, breath: 0,
            ...(lookFrame !== undefined ? { lookFrame: lookFrame as 0 | 1 } : {}) };
          const sprite = cat.createSprite();
          const footY = 135 + phase;
          cat.update(sprite, pose, scale * 4, footY);
          root.addChild(sprite);
          // Render every pose at the same absolute coordinates. UV ties can differ
          // even for an identical Texture translated into an adjacent atlas panel.
          const snapshot = RenderTexture.create({ width: 200, height: 150, resolution: 1 });
          snapshot.source.scaleMode = 'nearest';
          app.renderer.render({ container: root, target: snapshot, clear: true });
          const { pixels } = app.renderer.extract.pixels({ target: snapshot });
          if (!reference) reference = pixels;
          else {
            const x0 = Math.ceil(100 + phase - 54 * scale), x1 = Math.floor(100 + phase + 54 * scale);
            const y0 = Math.ceil(135 + phase - 80 * scale), y1 = Math.floor(135 + phase + scale);
            let bodyChangedPixels = 0, endpointChangedPixels = 0;
            for (let y = 0; y < 150; y++) for (let x = 0; x < 200; x++) {
              const offset = (y * 200 + x) * 4;
              let changed = false;
              for (let channel = 0; channel < 4; channel++) changed ||= reference[offset + channel] !== pixels[offset + channel];
              if (changed && x >= x0 && x < x1 && y >= y0 && y < y1) bodyChangedPixels++;
              if (changed && column === 4) endpointChangedPixels++;
            }
            if (bodyChangedPixels || endpointChangedPixels) throw new Error(`Seated composition changed: ${JSON.stringify({ scale, direction, phase, column, bodyChangedPixels, endpointChangedPixels })}`);
            comparisons.push({ row, column, bodyChangedPixels, endpointChangedPixels });
          }
          const panel = new Sprite(snapshot);
          panel.position.set(column * 200, row * 150);
          app.stage.addChild(panel);
          root.destroy({ children: true });
          poses.push({ x: pose.x, footY, lookFrame: pose.lookFrame });
        }
        samples.push({ row, scale, direction, phase, poses });
        row++;
      }
    }
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { panels: 80, bodyComparisons: comparisons.length, samples, comparisons,
    method: 'Neutral/shallow/clear/shallow/neutral, both directions, four production sprite scales, integer and fractional root phases. Each pose is compared at identical absolute root coordinates before its unchanged 1:1 snapshot is placed in the review atlas. Native seated RenderTextures share identical full-frame UVs.' };
}
