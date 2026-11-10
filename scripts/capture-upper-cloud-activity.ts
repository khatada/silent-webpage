import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { Texture, type Sprite } from 'pixi.js';
import { PNG } from 'pngjs';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { createImageUpperCloud, upperCloudGeometry } from '../src/image-upper-cloud';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-11-10-upper-cloud-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const results = [];
const correct = (input: string, physicalScale: number) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', String(physicalScale), '--scale', String(physicalScale)]);
for (const [name, width, height, dpr] of [['desktop', 1440, 900, 1], ['tall', 390, 1025, 2], ['small', 320, 568, 2]] as const) {
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
    const geometry = upperCloudGeometry(layout);
    const upperCloud = createImageUpperCloud(Texture.EMPTY);
    const position = (seconds: number) => {
      const sprite = { x: 0, width: geometry.width } as Sprite;
      upperCloud.update(sprite, seconds, v.width, layout.motionScale);
      return sprite.x;
    };
    const times = [0, 8, 16];
    const positions = times.map(position);
    const skyHeight = Math.min(height * dpr, Math.ceil((layout.skyBottom + 8) * v.physicalScale));
    if (skyHeight <= 0 || skyHeight > height * dpr) throw new Error(`${name}: invalid sky height ${skyHeight}`);
    const shots: PNG[] = []; let elapsed = 0;
    for (const seconds of times) {
      const target = seconds * 1000;
      while (elapsed < target) { const step = Math.min(1000, target - elapsed); await page.clock.runFor(step); elapsed += step; }
      const png = PNG.sync.read(await page.screenshot({ scale: 'device', animations: 'allow', timeout: 20000 }));
      if (png.width !== width * dpr || png.height !== height * dpr) throw new Error(`${name}: wrong screenshot dimensions ${png.width}x${png.height}`);
      shots.push(png);
      if (seconds === 16) { const file = `${output}/${name}-full-source.png`; await writeFile(file, PNG.sync.write(png)); correct(file, v.physicalScale); }
    }
    const atlas = new PNG({ width: width * dpr, height: skyHeight * shots.length });
    shots.forEach((shot, i) => PNG.bitblt(shot, atlas, 0, 0, shot.width, skyHeight, 0, i * skyHeight));
    if (atlas.width !== width * dpr || atlas.height !== skyHeight * 3) throw new Error(`${name}: wrong atlas dimensions`);
    const file = `${output}/${name}-sky-source.png`; await writeFile(file, PNG.sync.write(atlas)); correct(file, v.physicalScale);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const before = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 })); await page.clock.runFor(2000);
    const after = PNG.sync.read(await page.screenshot({ scale: 'device', timeout: 20000 }));
    if (!before.data.equals(after.data)) throw new Error(`${name}: paused pixels changed`);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(500); if (errors.length) throw new Error(errors.join('\n'));
    results.push({ name, viewport: [width, height, dpr], physicalScale: v.physicalScale, skyHeight, times, geometry,
      calculatedPositions: positions, calculatedEightSecondDisplacements: [positions[1] - positions[0], positions[2] - positions[1]],
      pauseExact: true, resumed: true, runtimeErrors: errors });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed during capture');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, results,
  method: 'Production page; separate Chromium per case; device DPR retained, running awaited, screenshot dimensions asserted. Native sky strips copied at 1:1. Positions calculated using production factory update and geometry.',
  limitations: 'Calculated positions are not measured. A 20fps final RAF may precede requested time; sky includes other actors. Finite snapshots do not show every instant. Resume confirms motion state, not a measured resumed displacement.' }, null, 2) + '\n');
