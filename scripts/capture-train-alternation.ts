import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { sceneTrainService, trainServiceState } from '../src/train-service';
import { artSourceHash } from './art-source-hash';

const output = 'art-reviews/2026-10-29-train-alternation-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const samples = [];
const correct = (input: string) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', input, '--output', input.replace('-source.png', '-corrected.png'), '--cell-size', '1', '--scale', '1']);
for (const [name, width, height] of [['narrow', 295, 844], ['wide', 800, 600]] as const) {
  const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const layout = generatedLayout(width, height), service = sceneTrainService(width, height, layout), schedule = service.schedule;
    const entry = schedule.period - schedule.phase, exit = entry - schedule.clearance;
    const times = [0, 1, exit - 0.15, exit + 0.2, entry + 0.2, entry + schedule.length / schedule.speed + 0.2];
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date(0) }); await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const railTop = Math.max(0, Math.floor(layout.railBottom - 65 * service.scale - 28)), railHeight = 100;
    const atlas = new PNG({ width, height: railHeight * times.length });
    let milliseconds = 0; const observed = [];
    for (const [index, second] of times.entries()) {
      const end = Math.round(second * 1000);
      while (milliseconds < end) { const step = Math.min(1000, end - milliseconds); await page.clock.runFor(step); milliseconds += step; }
      const pixels = PNG.sync.read(await page.screenshot({ animations: 'allow', scale: 'device', timeout: 15000 }));
      if (pixels.width !== width || pixels.height !== height) throw new Error('Unexpected screenshot dimensions');
      PNG.bitblt(pixels, atlas, 0, railTop, width, railHeight, 0, index * railHeight);
      if (index === times.length - 1) {
        const input = `${output}/${name}-reverse-full-source.png`; await writeFile(input, PNG.sync.write(pixels)); correct(input);
      }
      observed.push({ requestedSeconds: second, expected: trainServiceState(schedule, second) });
    }
    const input = `${output}/${name}-rail-source.png`; await writeFile(input, PNG.sync.write(atlas)); correct(input);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('canvas[data-motion="paused"]').waitFor({ state: 'attached' });
    const before = PNG.sync.read(await page.screenshot({ animations: 'allow', timeout: 15000 }));
    await page.clock.runFor(2000); const after = PNG.sync.read(await page.screenshot({ animations: 'allow', timeout: 15000 }));
    if (!before.data.equals(after.data)) throw new Error('Paused screenshot changed');
    await page.setViewportSize({ width: 900, height: 700 }); await page.clock.runFor(300);
    const resized = await page.locator('canvas').evaluate(canvas => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
    if (resized.width !== 900 || resized.height !== 700) throw new Error('Resize dimensions');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    await page.clock.runFor(300);
    if (errors.length) throw new Error(errors.join('\n'));
    samples.push({ name, viewport: [width, height], dpr: 1, railTop, railHeight, schedule, times: observed,
      reducedMotionPauseFullRgbaExact: true, resized, resumed: true });
  } finally { await browser.close(); }
}
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, method: 'Unmodified production page. Separate Chromium per case, DPR1 fixed, actual screenshot dimensions asserted; paused clock before goto, running awaited, runFor <=1000ms. Calculated expected positions are separate from actual screenshots.',
  limitations: 'Final20fps RAF may precede requested clock time. Finite six moments are not every-frame proof. DPR2 and fractional conditions are covered by initial scenes/static native API atlas, not these two clock sequences.', samples }, null, 2) + '\n');
console.log(output);
