import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const root = 'art-reviews/2026-10-23-skyline-lights-scenes';
const names = ['desktop', 'mobile', 'narrow', 'landscape', 'wide', 'compact', 'tall',
  'portrait-large', 'portrait-boundary', 'small-phone', 'small-mobile'];
const checks = names.map(name => {
  const previous = PNG.sync.read(readFileSync(`art-reviews/2026-10-23-upper-cloud-scenes/${name}-corrected.png`));
  const current = PNG.sync.read(readFileSync(`${root}/${name}-corrected.png`));
  const same = previous.width === current.width && previous.height === current.height && previous.data.equals(current.data);
  if (!same) throw new Error(`Initial lit skyline differs from original: ${name}`);
  return { name, width: current.width, height: current.height, rgbaUnchanged: same };
});
writeFileSync(`${root}/initial-rgba-checks.json`, `{"checks":[\n${checks.map(check => JSON.stringify(check)).join(',\n')}\n]}\n`);
console.log(`${checks.length} initial scenes are unchanged RGBA from the prior source.`);
