import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { artSourceHash } from './art-source-hash';

// Screenshots of the unmodified production page; no scene hooks or new artwork.
const output = 'art-reviews/train-speed-motion';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const samples: unknown[] = [];
try {
  for (const [name, width, height, dpr] of [['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['wide', 2560, 1080, 1]] as const) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let previous = 0;
    for (const seconds of name === 'mobile' ? [0, 1, 8.1, 8.3, 8.5, 9.3] : [0, 1]) {
      await page.clock.runFor(Math.round((seconds - previous) * 1000));
      previous = seconds;
      const input = `${output}/${name}-${seconds}-source.png`;
      const corrected = `${output}/${name}-${seconds}-corrected.png`;
      await page.locator('canvas').screenshot({ path: input });
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected, '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    // Estimate translation by minimum RGB absolute difference in a carriage patch.
    // Transparency/background and poles prevent claiming exact pixel equality.
    const first = PNG.sync.read(await readFile(`${output}/${name}-0-source.png`));
    const second = PNG.sync.read(await readFile(`${output}/${name}-1-source.png`));
    const layout = generatedLayout(width, height);
    const length = 264 * layout.scale * .24 * layout.composition.actorScale;
    let initial = width * .1, nearest = Infinity;
    for (const [x, y, w, h] of layout.composition.railPoles) {
      const px = Math.round(layout.originX + x * layout.scale), py = Math.round(layout.originY + y * layout.scale);
      if (px + w * layout.scale <= 0 || px >= width || py + h * layout.scale <= 0 || py >= height) continue;
      const center = Math.round(layout.originX + (x + w / 2) * layout.scale), distance = Math.abs(center - width * .25);
      if (distance < nearest) { nearest = distance; initial = center - length / 2; }
    }
    const patch = { x: (Math.floor(initial) + 15) * dpr, y: (layout.railBottom - 15) * dpr, width: 15 * dpr, height: 6 * dpr };
    const shifts: { nativeShift: number; absoluteRgbDifference: number }[] = [];
    for (let shift = 0; shift <= 120 * dpr; shift++) {
      let error = 0;
      for (let y = 0; y < patch.height; y++) for (let x = 0; x < patch.width; x++) for (let c = 0; c < 3; c++) {
        error += Math.abs(first.data[((patch.y + y) * first.width + patch.x + x) * 4 + c]! - second.data[((patch.y + y) * second.width + patch.x + x + shift) * 4 + c]!);
      }
      shifts.push({ nativeShift: shift / dpr, absoluteRgbDifference: error });
    }
    shifts.sort((a, b) => a.absoluteRgbDifference - b.absoluteRgbDifference);
    samples.push({ name, native: [width, height], patch, measuredBestShifts: shifts.slice(0, 2), calculatedNativePixelsPerSecond: layout.scale * 16, calculatedFirstWrapSeconds: (width - initial) / (layout.scale * 16) });
    await page.close();
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256, method: 'Unmodified production page, paused Playwright clock then runFor; minimum RGB absolute-difference carriage-patch translation estimate across screenshots, not exact pixel equality. Last rendered RAF precedes the requested clock time, so measured 0-to-1s displacement can be slightly below calculated speed. Coordinates of patches are screenshot physical pixels.', samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' }, null, 2) + '\n');
