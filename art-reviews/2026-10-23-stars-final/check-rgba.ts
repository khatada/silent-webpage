import { readFile, readdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const root = 'art-reviews/2026-10-23-stars-final';
const checks = [];
for (const name of await readdir(root)) {
  if (!/^(normal|wide|portrait)-\d$/.test(name)) continue;
  const capture = JSON.parse(await readFile(`${root}/${name}/atlas-capture.json`, 'utf8'));
  const image = PNG.sync.read(await readFile(`${root}/${name}/atlas-corrected.png`));
  for (const s of capture.metadata.samples) {
    if (!s.column) continue;
    let changed = 0, outside = 0, changedNonCore = 0;
    for (let y = s.row * s.rowHeight; y < (s.row + 1) * s.rowHeight; y++) {
      for (let x = 0; x < s.columnWidth; x++) {
        const a = (y * image.width + x) * 4, b = (y * image.width + x + s.column * s.columnWidth) * 4;
        if (image.data.subarray(a, a + 4).equals(image.data.subarray(b, b + 4))) continue;
        changed++;
        const px = x + s.column * s.columnWidth;
        const sx = Math.floor((px + 0.5 - s.originX) / s.scale);
        const sy = Math.floor((y + 0.5 - s.originY) / s.scale);
        if (sx !== s.core[0] || sy !== s.core[1]) changedNonCore++;
        if (px + 0.5 < s.originX + s.core[0] * s.scale || px + 0.5 >= s.originX + (s.core[0] + 1) * s.scale
          || y + 0.5 < s.originY + s.core[1] * s.scale || y + 0.5 >= s.originY + (s.core[1] + 1) * s.scale) outside++;
      }
    }
    checks.push({ composition: name.split('-')[0], starIndex: s.starIndex, scale: s.scale, column: s.column,
      alpha: s.alpha, changed, outside, changedNonCore, brightRgbaUnchanged: s.column === 1 ? changed === 0 : null });
  }
}
const summary = { comparisons: checks.length, coreOutside: checks.reduce((n,c)=>n+c.outside,0),
  nonCoreChanges: checks.reduce((n,c)=>n+c.changedNonCore,0), brightOriginalExact: checks.filter(c=>c.brightRgbaUnchanged).length };
if (summary.comparisons !== 405 || summary.coreOutside || summary.nonCoreChanges || summary.brightOriginalExact !== 135) throw new Error(JSON.stringify(summary));
await writeFile(`${root}/rgba-checks.json`, JSON.stringify({sourceSha256:'e9a8d44dd0d9e35e3857c20c019ac31b7c8a7a0c986ba54f93bceffdb500e62b',summary})+'\n');
console.log(summary);
