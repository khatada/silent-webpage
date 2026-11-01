import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { windsockGeometry } from '../src/image-windsock';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-10-31-windsock-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const results: unknown[] = [];
const correct = (input: string) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', '1', '--scale', '1']);
for (const [name, width, height] of [['wide', 2560, 1080], ['compact', 800, 600], ['landscape', 844, 390]] as const) {
  const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const layout = generatedLayout(width, height);
    const geo = windsockGeometry(width, height, layout, 1);
    if (!layout.wide || !geo.visible) throw new Error(`${name}: no visible windsock`);
    const margin = Math.ceil(layout.scale * 8);
    const crop = { x: Math.floor(geo.left) - margin, y: Math.floor(geo.top) - margin,
      width: Math.ceil(geo.right - geo.left) + 2 * margin, height: Math.ceil(geo.y - geo.top) + 2 * margin };
    const shots: PNG[] = [];
    let milliseconds = 0;
    for (const second of [0, 0.75, 1.2, 2.6, 3.2, 3.7]) {
      while (milliseconds < second * 1000) {
        const step = Math.min(1000, second * 1000 - milliseconds);
        await page.clock.runFor(step); milliseconds += step;
      }
      const shot = PNG.sync.read(await page.screenshot({ animations: 'allow', scale: 'device', timeout: 15000 }));
      if (shot.width !== width || shot.height !== height) throw new Error(`${name}: unexpected screenshot size`);
      shots.push(shot);
      if (second === 3.2) {
        const file = `${output}/${name}-full-source.png`;
        await writeFile(file, PNG.sync.write(shot)); correct(file);
      }
    }
    const atlas = new PNG({ width: crop.width * 3, height: crop.height * 2 });
    const differences = [];
    for (const [i, shot] of shots.entries()) {
      PNG.bitblt(shot, atlas, crop.x, crop.y, crop.width, crop.height, (i % 3) * crop.width, Math.floor(i / 3) * crop.height);
      let changed = 0;
      for (let y = crop.y; y < crop.y + crop.height; y++) for (let x = crop.x; x < crop.x + crop.width; x++) {
        const n = (y * width + x) * 4;
        if (!shot.data.subarray(n, n + 4).equals(shots[0].data.subarray(n, n + 4))) changed++;
      }
      differences.push(changed);
    }
    const file = `${output}/${name}-poses-source.png`;
    await writeFile(file, PNG.sync.write(atlas)); correct(file);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const pausedA = PNG.sync.read(await page.screenshot({ animations: 'allow', timeout: 15000 }));
    await page.clock.runFor(2000);
    const pausedB = PNG.sync.read(await page.screenshot({ animations: 'allow', timeout: 15000 }));
    const pauseExact = pausedA.data.equals(pausedB.data);
    if (!pauseExact) throw new Error(`${name}: reduced motion pixels changed`);
    await page.setViewportSize({ width: 900, height: 700 });
    await page.clock.runFor(500);
    const resized = await page.locator('canvas').evaluate(canvas => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
    if (resized.width !== 900 || resized.height !== 700) throw new Error(`${name}: resize failed`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(500);
    if (errors.length) throw new Error(errors.join('\n'));
    results.push({ name, viewport: [width, height], dpr: 1, crop, geometry: geo, times: [0, 0.75, 1.2, 2.6, 3.2, 3.7],
      changedPixelsVsInitialInContext: differences, reducedMotionPauseRgbaExact: pauseExact, resized, resumed: true });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, method: 'Unmodified production page, DPR1, separate browser per view. Paused clock before navigation; running state awaited. Times advanced in <=1000ms steps. Full screenshots cropped at actual native resolution. No artwork generated.', limitations: 'Requested times may precede final 20fps RAF. Context pixel differences include other moving subjects. Not a full-cycle or all-device proof.', results }, null, 2) + '\n');
console.log(output);
