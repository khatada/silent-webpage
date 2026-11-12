import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { streetCarScenes } from '../src/image-street-car';
import { streetCarTiming } from '../src/street-car-timing';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-11-10-street-car-frequency';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const times = [0, 2, 4, 6, 10.5, 16.5, 20];
const boundaries = [10.49, 10.5, 16.49, 16.5].map(seconds => ({ seconds, ...streetCarTiming(seconds) }));
if (!boundaries[0].visible || boundaries[1].visible || boundaries[2].visible || !boundaries[3].visible) {
  throw new Error('Unexpected street-car timing at pass boundaries');
}
const correct = (input: string, physicalScale: number) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', String(physicalScale), '--scale', String(physicalScale)]);
const results = [];
for (const [name, width, height, dpr] of [['desktop', 1440, 900, 1], ['landscape', 844, 390, 2], ['tall', 390, 1025, 2]] as const) {
  const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) }); await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const v = pixelViewport(width, height, dpr), layout = generatedLayout(v.width, v.height);
    const sceneIndex = layout.portrait ? 2 : layout.wide ? 1 : 0;
    const [cx, cy, cw, ch] = streetCarScenes[sceneIndex].context;
    const x = Math.max(0, Math.floor(layout.originX + cx * layout.scale) * v.physicalScale);
    const y = Math.max(0, Math.floor(layout.originY + cy * layout.scale) * v.physicalScale);
    const right = Math.min(width * dpr, Math.ceil(layout.originX + (cx + cw) * layout.scale) * v.physicalScale);
    const bottom = Math.min(height * dpr, Math.ceil(layout.originY + (cy + ch) * layout.scale) * v.physicalScale);
    const cropWidth = right - x, cropHeight = bottom - y;
    if (cropWidth <= 0 || cropHeight <= 0) throw new Error(`${name}: road context is outside the viewport`);
    const shots: PNG[] = []; let elapsed = 0;
    for (const seconds of times) {
      const target = Math.round(seconds * 1000);
      while (elapsed < target) { const step = Math.min(1000, target - elapsed); await page.clock.runFor(step); elapsed += step; }
      const png = PNG.sync.read(await page.screenshot({ scale: 'device', animations: 'allow', timeout: 20000 }));
      if (png.width !== width * dpr || png.height !== height * dpr) throw new Error(`${name}: wrong screenshot dimensions ${png.width}x${png.height}`);
      shots.push(png);
      if (seconds === 20) { const file = `${output}/${name}-full-source.png`; await writeFile(file, PNG.sync.write(png)); correct(file, v.physicalScale); }
    }
    const atlas = new PNG({ width: cropWidth, height: cropHeight * shots.length });
    shots.forEach((shot, i) => PNG.bitblt(shot, atlas, x, y, cropWidth, cropHeight, 0, i * cropHeight));
    if (atlas.width !== cropWidth || atlas.height !== cropHeight * times.length) throw new Error(`${name}: wrong atlas dimensions`);
    const file = `${output}/${name}-road-source.png`; await writeFile(file, PNG.sync.write(atlas)); correct(file, v.physicalScale);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const before = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 })); await page.clock.runFor(2000);
    const after = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 }));
    if (!before.data.equals(after.data)) throw new Error(`${name}: paused pixels changed`);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(500); if (errors.length) throw new Error(errors.join('\n'));
    results.push({ name, viewport: [width, height, dpr], physicalScale: v.physicalScale, sceneIndex,
      contextPhysical: [x, y, cropWidth, cropHeight], times, calculatedTiming: times.map(seconds => ({ seconds, ...streetCarTiming(seconds) })),
      pauseExact: true, resumed: true, runtimeErrors: errors });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed during capture');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, results, calculatedBoundaries: boundaries,
  method: 'Production page; separate Chromium per case, running awaited and device screenshot dimensions asserted. Road context strips copied at native resolution from actual screenshots.',
  limitations: 'Timing states and exact boundaries are calculated, not measured; the 20fps final RAF may precede requested capture time. Crops may be clipped at viewport edges. Finite snapshots do not show every instant. Resume confirms running state only.' }, null, 2) + '\n');
