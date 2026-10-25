import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageRoomLights, roomLightAreas } from '../src/image-room-lights';
import { nativeReviewTransform } from './native-review-transform';
import { windowReviewBackground } from './window-review-background';

/** Same-position production covers over whole-background GPU crops; no artwork created. */
export async function renderGeneratedRoomLightReview() {
  const compositions = [generatedArt, generatedArt.wide, generatedArt.portrait];
  const sources = await Promise.all(compositions.map(composition => Assets.load<Texture>(`/${composition.background}`)));
  for (const source of sources) source.source.scaleMode = 'nearest';
  const factory = createImageRoomLights(sources);
  const app = new Application();
  const panelSize = 160;
  await app.init({ width: panelSize * 4, height: panelSize * 9, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples = [];
  const comparisons = [];
  let row = 0;
  for (const [compositionIndex, composition] of compositions.entries()) {
    const compositionId = compositionIndex as 0 | 1 | 2;
    const area = roomLightAreas[compositionId];
    const window = composition.windows[area.windowIndex];
    const rectangles = area.leftGlass ? [area.leftGlass, area.glass] : [area.glass];
    const x = Math.min(...rectangles.map(rect => rect[0])) - 4;
    const y = Math.min(...rectangles.map(rect => rect[1])) - 4;
    const right = Math.max(...rectangles.map(rect => rect[0] + rect[2])) + 4;
    const bottom = Math.max(...rectangles.map(rect => rect[1] + rect[3])) + 4;
    const context = [x, y, right - x, bottom - y] as const;
    const wall = new Texture({ source: sources[compositionIndex].source,
      frame: new Rectangle(...composition.darkWall) });
    const background = windowReviewBackground(app, sources[compositionIndex]);
    for (const scale of [0.5, 1, 4]) {
      const transform = nativeReviewTransform(8, 8, context, scale);
      let reference: Uint8Array | Uint8ClampedArray | undefined;
      for (const [column, state] of ['original', 'on', 'mid', 'off'].entries()) {
        const root = new Container();
        root.addChild(background(context, scale, transform.originX, transform.originY));
        const cover = factory.createCover(compositionId, area.windowIndex, window, wall,
          scale, transform.originX, transform.originY);
        cover.alpha = state === 'mid' ? 0.46 : state === 'off' ? 0.92 : 0;
        root.addChild(cover);
        const snapshot = RenderTexture.create({ width: panelSize, height: panelSize, resolution: 1 });
        snapshot.source.scaleMode = 'nearest';
        app.renderer.render({ container: root, target: snapshot, clear: true });
        const { pixels } = app.renderer.extract.pixels({ target: snapshot });
        if (!reference) reference = pixels;
        else {
          let changedInsidePixels = 0, changedOutsidePixels = 0;
          for (let py = 0; py < panelSize; py++) for (let px = 0; px < panelSize; px++) {
            const offset = (py * panelSize + px) * 4;
            let changed = false;
            for (let c = 0; c < 4; c++) changed ||= pixels[offset + c] !== reference[offset + c];
            if (!changed) continue;
            const inside = rectangles.some(([rx, ry, rw, rh]) => px + 0.5 >= transform.originX + rx * scale
              && px + 0.5 < transform.originX + (rx + rw) * scale
              && py + 0.5 >= transform.originY + ry * scale
              && py + 0.5 < transform.originY + (ry + rh) * scale);
            if (inside) changedInsidePixels++; else changedOutsidePixels++;
          }
          if (changedOutsidePixels || (state === 'on' && changedInsidePixels)
            || (state !== 'on' && !changedInsidePixels)) {
            throw new Error(`Room cover mismatch ${JSON.stringify({ compositionIndex, scale, state, changedInsidePixels, changedOutsidePixels })}`);
          }
          comparisons.push({ row, column, changedInsidePixels, changedOutsidePixels });
        }
        const panel = new Sprite(snapshot);
        panel.position.set(column * panelSize, row * panelSize);
        app.stage.addChild(panel);
        root.destroy({ children: true });
      }
      samples.push({ row, compositionIndex, windowIndex: area.windowIndex, scale, context,
        rectangles, ...transform });
      row++;
    }
    wall.destroy(false);
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { panels: row * 4, states: ['original', 'on', 'mid', 'off'], samples, comparisons,
    method: 'Three backgrounds at .5/1/4. Each state rendered/extracted at identical absolute coordinates; whole-background RenderTexture crop preserves nearest sampling. Snapshots placed unchanged at 1:1. Strict pixel-center rectangle mask; outside glass changes must be zero, on must equal original.' };
}
