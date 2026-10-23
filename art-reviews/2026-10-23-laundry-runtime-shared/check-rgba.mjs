import fs from 'node:fs';
import { PNG } from 'pngjs';
const dir = 'art-reviews/2026-10-23-laundry-runtime-shared';
const image = PNG.sync.read(fs.readFileSync(`${dir}/atlas-corrected.png`));
const metadata = JSON.parse(fs.readFileSync(`${dir}/atlas-capture.json`)).metadata;
const pixel = (x, y) => image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
const checks = [];
for (let row = 0; row < 6; row++) {
  const samples = metadata.samples.filter(sample => sample.row === row);
  const background = samples[0], reference = samples[1];
  for (const sample of samples.slice(1)) {
    if (!Number.isInteger(sample.originX) || !Number.isInteger(sample.originY)) throw new Error('Noninteger background origin');
    let outside = 0, changed = 0, fixedTopMismatch = 0;
    const [safeX, safeY, safeWidth, safeHeight] = sample.placement.safe;
    const foldEnd = sample.originY + (sample.placement.center[1] + 6 * sample.placement.height / 74) * sample.scale;
    for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
      const px = sample.panelX + x, py = sample.panelY + y;
      const current = pixel(px, py);
      if (!current.equals(pixel(background.panelX + x, background.panelY + y))) {
        changed++;
        if (px < sample.originX + safeX * sample.scale || px >= sample.originX + (safeX + safeWidth) * sample.scale ||
          py < sample.originY + safeY * sample.scale || py >= sample.originY + (safeY + safeHeight) * sample.scale) outside++;
      }
      if (py < Math.floor(foldEnd) && !current.equals(pixel(reference.panelX + x, reference.panelY + y))) fixedTopMismatch++;
    }
    checks.push({ row, frame: sample.frame, changed, outside, fixedTopMismatch });
  }
}
const previous = PNG.sync.read(fs.readFileSync('art-reviews/2026-10-23-laundry-runtime-final/atlas-corrected.png'));
const previousRgbaUnchanged = image.width === previous.width && image.height === previous.height && image.data.equals(previous.data);
if (!previousRgbaUnchanged) throw new Error('Shared transform changed final atlas pixels');
fs.writeFileSync(`${dir}/rgba-checks.json`, JSON.stringify({ previousRgbaUnchanged, checks }, null, 2) + '\n');
if (checks.some(check => check.outside || check.fixedTopMismatch)) throw new Error('RGBA preservation failure');
console.log(`${checks.length} comparisons: outside0, fixedTopMismatch0; all production origins integral.`);
