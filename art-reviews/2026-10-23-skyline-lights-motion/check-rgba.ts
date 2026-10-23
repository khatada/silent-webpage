import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const root = 'art-reviews/2026-10-23-skyline-lights-motion';
type Sample = { composition: number; windowIndex: number; scale: number; row: number; column: number;
  columnWidth: number; rowHeight: number; originX: number; originY: number; lit: number[]; alpha: number };
const checks: unknown[] = [];
for (const composition of ['normal', 'wide', 'portrait']) {
  const png = PNG.sync.read(readFileSync(`${root}/${composition}/atlas-corrected.png`));
  const capture = JSON.parse(readFileSync(`${root}/${composition}/atlas-capture.json`, 'utf8'));
  const samples: Sample[] = capture.metadata.samples;
  for (const sample of samples.filter(sample => sample.column > 0)) {
    const { columnWidth, rowHeight, row, column, scale, lit, originX, originY } = sample;
    if (!Number.isInteger(originX) || !Number.isInteger(originY)) throw new Error('Fractional background origin');
    const bounds = [Math.floor(originX + lit[0] * scale), Math.floor(originY + lit[1] * scale),
      Math.ceil(originX + (lit[0] + lit[2]) * scale), Math.ceil(originY + (lit[1] + lit[3]) * scale)];
    let changed = 0, outside = 0;
    for (let y = row * rowHeight; y < (row + 1) * rowHeight; y++) for (let x = 0; x < columnWidth; x++) {
      const currentX = x + column * columnWidth;
      const reference = (y * png.width + x) * 4, current = (y * png.width + currentX) * 4;
      if (!png.data.subarray(reference, reference + 4).equals(png.data.subarray(current, current + 4))) {
        changed++;
        if (currentX < bounds[0] || currentX >= bounds[2] || y < bounds[1] || y >= bounds[3]) outside++;
      }
    }
    if (outside || (column === 1 && changed)) throw new Error(`Unexpected background change ${composition}/${row}/${column}`);
    if (column === 3 && scale >= 1 && !changed) throw new Error('No visible dimming at native or enlarged scale');
    checks.push({ composition, windowIndex: sample.windowIndex, scale, column, alpha: sample.alpha,
      changed, outside, litRgbaUnchanged: column === 1 ? changed === 0 : null });
  }
}
writeFileSync(`${root}/rgba-checks.json`, `{"checks":[\n${checks.map(check => JSON.stringify(check)).join(',\n')}\n]}\n`);
console.log(`${checks.length} comparisons: no outside change; all lit panels match original RGBA.`);
