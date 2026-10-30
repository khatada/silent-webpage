import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import { generatedLayout } from '../src/generated-layout';
import { cityMotion } from '../src/city-motion';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-10-30-visible-cloud-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const results = [];
const correct = (input: string) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', '1', '--scale', '1']);
for (const [name, width, height] of [['desktop', 1440, 900], ['compact', 800, 600], ['mobile', 390, 844]] as const) {
  const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) }); await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const layout = generatedLayout(width, height); const skyHeight = Math.min(height, layout.skyBottom + 8);
    const shots: PNG[] = []; let elapsed = 0;
    for (const seconds of [0, 4, 8]) {
      while (elapsed < seconds * 1000) { const step = Math.min(1000, seconds * 1000 - elapsed); await page.clock.runFor(step); elapsed += step; }
      const png = PNG.sync.read(await page.screenshot({ scale: 'device', animations: 'allow', timeout: 15000 }));
      if (png.width !== width || png.height !== height) throw new Error(`${name}: wrong screenshot dimensions`);
      shots.push(png);
      if (seconds === 4) { const file = `${output}/${name}-full-source.png`; await writeFile(file, PNG.sync.write(png)); correct(file); }
    }
    const atlas = new PNG({ width, height: skyHeight * 3 });
    shots.forEach((shot, i) => PNG.bitblt(shot, atlas, 0, 0, width, skyHeight, 0, i * skyHeight));
    const file = `${output}/${name}-sky-source.png`; await writeFile(file, PNG.sync.write(atlas)); correct(file);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const before = await page.screenshot({ scale: 'device', timeout: 15000 }); await page.clock.runFor(2000);
    const after = await page.screenshot({ scale: 'device', timeout: 15000 });
    const a = PNG.sync.read(before), b = PNG.sync.read(after); const pauseExact = a.data.equals(b.data);
    if (!pauseExact) throw new Error(`${name}: paused pixels changed`);
    await page.setViewportSize({ width: 900, height: 700 }); await page.clock.runFor(500);
    const resized = await page.locator('canvas').evaluate(canvas => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(500); if (errors.length) throw new Error(errors.join('\n'));
    results.push({ name, width, height, dpr: 1, times: [0, 4, 8], skyHeight, motionScale: layout.motionScale,
      calculatedCloudPixelsPerSecond: layout.motionScale * cityMotion.cloudSpeed, pauseExact, resized, resumed: true });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed during capture');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, results,
  method: 'Production page; one Chromium per DPR1 case, running awaited and dimensions asserted. Sky strips copied from screenshots at native pixels.',
  limitations: 'Calculated velocity differs from actual sampled final RAF; finite samples do not verify all times. The crop includes other moving sky actors. Resize checks dimensions, not visual adoption.' }, null, 2) + '\n');
