import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImagePlant, plantArt } from '../src/image-plant';
import { plantFrame } from '../src/plant-timing';

/** Compare factory poses at identical coordinates; atlas panels are unchanged snapshots. */
export async function renderGeneratedPlantReview() {
  const [source, background] = await Promise.all([Assets.load<Texture>(`/${plantArt.image}`),
    Assets.load<Texture>(`/${generatedArt.background}`)]);
  background.source.scaleMode = 'nearest';
  const app = new Application();
  await app.init({ width: 1000, height: 1800, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const plant = createImagePlant(source, app.renderer);
  const floor = new Texture({ source: background.source, frame: new Rectangle(280, 362, 200, 150) });
  const samples = [], comparisons = [];
  let row = 0;
  for (const scale of [0.25, 0.375, 0.5, 0.625]) for (const phase of [0, 0.375, 0.5]) {
    let reference: Uint8ClampedArray | Uint8Array | undefined;
    for (const [column, seconds] of [0, 4.5, 6.75, 11.25, 13.5].entries()) {
      const root = new Container();
      root.addChild(new Sprite(floor));
      const x = 100 + phase, footY = 135 + phase;
      const sprite = plant.createSprite({ x, footY, scale, width: 80 * scale, height: 112 * scale,
        top: footY - 111 * scale, bottom: footY + scale, visible: true });
      plant.update(sprite, seconds);
      root.addChild(sprite);
      const snapshot = RenderTexture.create({ width: 200, height: 150, resolution: 1 });
      snapshot.source.scaleMode = 'nearest';
      app.renderer.render({ container: root, target: snapshot, clear: true });
      const { pixels } = app.renderer.extract.pixels({ target: snapshot });
      if (!reference) reference = pixels;
      else {
        const inRegion = (px: number, py: number, left: number, top: number, right: number, bottom: number) =>
          px >= Math.ceil(x + (left - 40) * scale) && px < Math.floor(x + (right - 40) * scale)
          && py >= Math.ceil(footY + (top - 111) * scale) && py < Math.floor(footY + (bottom - 111) * scale);
        let potChangedPixels = 0, stemChangedPixels = 0, neutralChangedPixels = 0;
        for (let py = 0; py < 150; py++) for (let px = 0; px < 200; px++) {
          const offset = (py * 200 + px) * 4;
          let changed = false;
          for (let channel = 0; channel < 4; channel++) changed ||= pixels[offset + channel] !== reference[offset + channel];
          if (!changed) continue;
          if (inRegion(px, py, 0, 70, 80, 112)) potChangedPixels++;
          if (inRegion(px, py, 37, 26, 44, 70)) stemChangedPixels++;
          if (plantFrame(seconds) === 0) neutralChangedPixels++;
        }
        if (potChangedPixels || stemChangedPixels || neutralChangedPixels) {
          throw new Error(`Plant moved its fixed support: ${JSON.stringify({ scale, phase, seconds, potChangedPixels, stemChangedPixels, neutralChangedPixels })}`);
        }
        comparisons.push({ row, column, potChangedPixels, stemChangedPixels, neutralChangedPixels });
      }
      const panel = new Sprite(snapshot);
      panel.position.set(column * 200, row * 150);
      app.stage.addChild(panel);
      root.destroy({ children: true });
    }
    samples.push({ row, scale, phase, rootX: 100 + phase, footY: 135 + phase });
    row++;
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { panels: 60, fixedPartComparisons: comparisons.length, neutralReturnPairs: 24,
    times: [0, 4.5, 6.75, 11.25, 13.5], samples, comparisons,
    method: 'Factory neutral/A/neutral/B/neutral, four production sprite scales, integer/.375/.5 root phases. Same-position GPU snapshots preserve fixed pot and stem sampling.' };
}
