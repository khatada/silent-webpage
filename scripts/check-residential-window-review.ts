import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { artSourceHash } from './art-source-hash';

interface Sample {
  row: number; column: number; window: number[]; scale: number; state?: string;
  pose?: number; lightSeconds?: number; alpha: number;
  originX?: number; originY?: number; rootX?: number; rootY?: number;
}
const sourceSha256 = await artSourceHash();
const results = [];
for (const name of ['normal', 'wide', 'portrait', 'resident', 'curtain']) {
  const actors = name === 'resident' || name === 'curtain';
  const root = actors ? `art-reviews/residential-${name}-sampling`
    : `art-reviews/residential-window-sampling/${name}`;
  const capture = JSON.parse(await readFile(`${root}/atlas-capture.json`, 'utf8'));
  if (capture.sourceSha256 !== sourceSha256 || !capture.rgbaUnchanged) {
    throw new Error(`Stale source or changed correction RGBA: ${name}`);
  }
  const png = PNG.sync.read(await readFile(`${root}/atlas-corrected.png`));
  const samples: Sample[] = capture.metadata.samples;
  const panelHeight = actors ? 192 : 128;
  let comparisons = 0, outsideChanges = 0, litChanges = 0, offChanges = 0, changedPixels = 0, offMaxChannelDelta = 0;
  for (const sample of samples) {
    if (actors ? sample.pose! < 0 : sample.state === 'original') continue;
    const baseline = samples.find(other => actors
      ? other.pose! < 0 && other.row === sample.row && other.lightSeconds === sample.lightSeconds
      : other.state === 'original' && other.column === sample.column && other.scale === sample.scale)!;
    if (!baseline) throw new Error(`Missing baseline: ${name}`);
    const originX = sample.originX ?? sample.rootX!, originY = sample.originY ?? sample.rootY!;
    const [wx, wy, ww, wh] = sample.window;
    const left = originX + wx * sample.scale, top = originY + wy * sample.scale;
    const right = left + ww * sample.scale, bottom = top + wh * sample.scale;
    for (let y = 0; y < panelHeight; y++) for (let x = 0; x < 128; x++) {
      const px = sample.column * 128 + x, py = sample.row * panelHeight + y;
      const a = (py * png.width + px) * 4;
      const b = ((baseline.row * panelHeight + y) * png.width + baseline.column * 128 + x) * 4;
      if (png.data.subarray(a, a + 4).equals(png.data.subarray(b, b + 4))) continue;
      changedPixels++;
      // WebGL top/left fill rule, including ties after the framebuffer's vertical flip.
      if (px + 0.5 < left || px + 0.5 >= right || py + 0.5 <= top || py + 0.5 > bottom) outsideChanges++;
      if (sample.state === 'on') litChanges++;
      if (sample.alpha === 0.92) {
        offChanges++;
        for (let channel = 0; channel < 3; channel++) {
          offMaxChannelDelta = Math.max(offMaxChannelDelta, Math.abs(png.data[a + channel] - png.data[b + channel]));
        }
      }
    }
    comparisons++;
  }
  if (outsideChanges || litChanges || (name === 'resident' && offChanges)) {
    throw new Error(`${name}: outside=${outsideChanges}, lit=${litChanges}, off=${offChanges}`);
  }
  results.push({ name, comparisons, outsideChanges, litChanges, offChanges, offMaxChannelDelta, changedPixels });
}
const report = { sourceSha256, method: 'Corrected RGBA; each state against the same whole-background RenderTexture crop sampling phase. Actors use no-actor reference at the same light state.',
  curtainOff: 'Existing 92% cover retains 8% curtain color inside the window; not a complete blackout.', results };
await writeFile('art-reviews/residential-window-sampling/rgba-proof.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
