import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { birdGeometry, birdState } from '../src/image-bird';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-10-31-bird-flight-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const results = [];
const correct = (input: string, physicalScale: number) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', String(physicalScale), '--scale', String(physicalScale)]);
for (const [name, width, height, dpr] of [['desktop', 1440, 900, 1], ['compact', 800, 600, 1], ['mobile', 390, 844, 2]] as const) {
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
    const geometry = birdGeometry(v.width, layout, v.physicalScale);
    const skyHeight = Math.min(height * dpr, Math.ceil((layout.skyBottom + 8) * v.physicalScale));
    const shots: PNG[] = []; let elapsed = 0;
    const times = [0, ...Array.from({ length: 8 }, (_, i) => Math.round((geometry.first + 2.87 + i * 0.14) * 1000) / 1000), Math.round((geometry.first + 10) * 1000) / 1000];
    for (const seconds of times) {
      const target = Math.round(seconds * 1000);
      while (elapsed < target) { const step = Math.min(1000, target - elapsed); await page.clock.runFor(step); elapsed += step; }
      const png = PNG.sync.read(await page.screenshot({ scale: 'device', animations: 'allow', timeout: 20000 }));
      if (png.width !== width * dpr || png.height !== height * dpr) throw new Error(`${name}: wrong screenshot dimensions ${png.width}x${png.height}`);
      shots.push(png);
      if (seconds === times[times.length - 1]) { const file = `${output}/${name}-full-source.png`; await writeFile(file, PNG.sync.write(png)); correct(file, v.physicalScale); }
    }
    const atlas = new PNG({ width: width * dpr, height: skyHeight * shots.length });
    shots.forEach((shot, i) => PNG.bitblt(shot, atlas, 0, 0, shot.width, skyHeight, 0, i * skyHeight));
    const file = `${output}/${name}-sky-source.png`; await writeFile(file, PNG.sync.write(atlas)); correct(file, v.physicalScale);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const before = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 })); await page.clock.runFor(2000);
    const after = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 }));
    if (!before.data.equals(after.data)) throw new Error(`${name}: paused pixels changed`);
    await page.setViewportSize({ width: 900, height: 700 }); await page.clock.runFor(500);
    const resized = await page.locator('canvas').evaluate(canvas => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(500); if (errors.length) throw new Error(errors.join('\n'));
    results.push({ name, viewport: [width, height, dpr], physicalScale: v.physicalScale, skyHeight, times,
      geometry, calculatedStates: times.map(t => birdState(t, v.width, geometry)), pauseExact: true, resized, resumed: true });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed during capture');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, results,
  method: 'Production page; separate Chromium per case; device DPR retained, running awaited, screenshot dimensions asserted. Native sky strips copied at 1:1.',
  limitations: 'Expected state and positions are calculated, not measured. 20fps final RAF may precede requested time; sky includes clouds and aircraft. Finite snapshots do not show every instant. Resize checks dimensions, not visual adoption.' }, null, 2) + '\n');
