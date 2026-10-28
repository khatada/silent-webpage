import { mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { catPose } from '../src/animation';
import { plantGeometry } from '../src/image-plant';
import { streetCarTiming } from '../src/street-car-timing';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
const output = values.output ?? 'art-reviews/2026-10-28-wide-fine-active';
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'wide-fine-active-'));
await mkdir(output, { recursive: false });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const captures: unknown[] = [];
function correct(input: string, corrected: string, grid: number) {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input,
    '--output', corrected, '--cell-size', String(grid), '--scale', String(grid)], { stdio: 'ignore' });
}
try {
  for (const [name, cssWidth, cssHeight, dpr, activity] of [
    ['desktop-wide', 2560, 1080, 1, true], ['compact', 800, 600, 1, true], ['landscape', 844, 390, 2, true],
    ['wide-1920', 1920, 720, 1, false], ['wide-3200', 3200, 1080, 1, false], ['extreme', 2000, 500, 1, false],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr), grid = viewport.physicalScale;
    const layout = generatedLayout(viewport.width, viewport.height);
    if (!layout.wide) throw new Error(`${name}: expected actual wide composition`);
    const actorScale = layout.motionScale * layout.composition.actorScale;
    const trainWidth = 264 * actorScale * .24, trainHeight = 65 * actorScale * .24;
    let initialTrainX = viewport.width * .1, nearest = Infinity;
    for (const [x, y, w, h] of layout.composition.railPoles) {
      const px = Math.round(layout.originX + x * layout.scale), py = Math.round(layout.originY + y * layout.scale);
      if (px + w * layout.scale <= 0 || px >= viewport.width || py + h * layout.scale <= 0 || py >= viewport.height) continue;
      const center = Math.round(layout.originX + (x + w / 2) * layout.scale), distance = Math.abs(center - viewport.width * .25);
      if (distance < nearest) { nearest = distance; initialTrainX = center - trainWidth / 2; }
    }
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const times = activity ? [0, 1, 4, 8] : [0, 4];
    const shots: PNG[] = [], calculatedSamples: unknown[] = [];
    let milliseconds = 0;
    for (const seconds of times) {
      while (milliseconds < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - milliseconds);
        await page.clock.runFor(step); milliseconds += step;
      }
      const file = `${temporary}/${name}-${seconds}.png`;
      await page.locator('canvas').screenshot({ path: file });
      const shot = PNG.sync.read(await readFile(file));
      if (shot.width !== viewport.width * grid || shot.height !== viewport.height * grid) throw new Error(`${name}: canvas screenshot dimensions differ`);
      shots.push(shot);
      calculatedSamples.push({ requestedSeconds: seconds, catPose: catPose(seconds, viewport.width, actorScale), streetCarTiming: streetCarTiming(seconds) });
      if (seconds === 4 || (!activity && seconds === 0)) {
        const full = `${output}/${name}-${seconds}-full-source.png`;
        await copyFile(file, full); correct(full, `${output}/${name}-${seconds}-full-corrected.png`, grid);
      }
    }
    const atlases: unknown[] = [];
    if (activity) {
      const bands = [
        { name: 'rail', top: Math.max(0, Math.floor(layout.railBottom - trainHeight - 8)), bottom: Math.min(viewport.height, Math.ceil(layout.railBottom + 16 * layout.scale)) },
        { name: 'road-roof', top: Math.max(0, Math.floor(layout.originY + 146 * layout.scale)), bottom: viewport.height },
      ];
      for (const band of bands) {
        const y = band.top * grid, height = (band.bottom - band.top) * grid;
        const maxTileWidth = 640;
        for (let x = 0, tile = 0; x < shots[0]!.width; x += maxTileWidth, tile++) {
          const width = Math.min(maxTileWidth, shots[0]!.width - x);
          const atlas = new PNG({ width: width * 2, height: height * 2 });
          if (atlas.width * atlas.height > 16_000_000) throw new Error('Review atlas exceeds 16MP');
          const changesVsInitial: number[] = [];
          for (const [panel, shot] of shots.entries()) {
            PNG.bitblt(shot, atlas, x, y, width, height, (panel % 2) * width, Math.floor(panel / 2) * height);
            let changed = 0;
            for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) {
              const offset = (yy * shot.width + xx) * 4;
              if (!shot.data.subarray(offset, offset + 4).equals(shots[0]!.data.subarray(offset, offset + 4))) changed++;
            }
            changesVsInitial.push(changed);
          }
          const source = `${output}/${name}-${band.name}-${tile}-source.png`;
          await writeFile(source, PNG.sync.write(atlas)); correct(source, source.replace('-source.png', '-corrected.png'), grid);
          atlases.push({ file: source.replace('-source.png', '-corrected.png'), cropPhysical: { x, y, width, height }, panels: [[0, 1], [4, 8]], measuredChangedPixelsVsInitial: changesVsInitial });
        }
      }
    }
    // Estimate carriage displacement using captured RGB, separately from predicted velocity.
    const patch = { x: Math.max(0, Math.round(initialTrainX + trainWidth * .15)) * grid,
      y: Math.round(layout.railBottom - trainHeight * .65) * grid,
      width: Math.max(3, Math.floor(trainWidth * .12)) * grid, height: Math.max(2, Math.floor(trainHeight * .2)) * grid };
    const shifts: { physicalShift: number; summedAbsoluteRgbDifference: number }[] = [];
    if (activity && patch.y >= 0 && patch.y + patch.height <= shots[0]!.height) {
      const maxShift = Math.ceil((layout.motionScale * 16 + 8) * grid);
      for (let shift = 0; shift <= maxShift && patch.x + patch.width + shift <= shots[0]!.width; shift++) {
        let error = 0;
        for (let y = 0; y < patch.height; y++) for (let x = 0; x < patch.width; x++) for (let channel = 0; channel < 3; channel++) {
          const a = ((patch.y + y) * shots[0]!.width + patch.x + x) * 4 + channel;
          error += Math.abs(shots[0]!.data[a]! - shots[1]!.data[a + shift * 4]!);
        }
        shifts.push({ physicalShift: shift, summedAbsoluteRgbDifference: error });
      }
      shifts.sort((a, b) => a.summedAbsoluteRgbDifference - b.summedAbsoluteRgbDifference);
    }
    captures.push({ name, css: [cssWidth, cssHeight], dpr, viewport, calculated: { layout,
      plant: plantGeometry(layout, viewport.width, viewport.height), actorScale, trainWidth, trainHeight, initialTrainX,
      trainPixelsPerSecond: layout.motionScale * 16, trainPhysicalPixelsPerSecond: layout.motionScale * 16 * grid, samples: calculatedSamples },
      measured: { screenshotPhysical: [shots[0]!.width, shots[0]!.height], trainTranslationPatchPhysical: patch,
        bestOneSecondTrainRgbShifts: shifts.slice(0, 3), runtimeErrors: errors }, atlases });
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard these screenshots');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256,
  method: 'Unmodified production page. Paused clock before goto; reduced motion disabled after ready; actual canvas running awaited. Sequential runFor <=1000ms. Usual three sizes retain 4s full; additional sizes retain 0/4s full. Rail and road/roof atlases contain native screenshot tiles in 2x2 time order 0/1/4/8; no artwork generated. Correction uses actual physical canvas grid.',
  limitations: 'Calculated motionScale/poses/geometry are predictions, not observed exact scene time. Pixi 20fps RAF may precede requested time. RGB translation is a best-match estimate affected by poles and moving content, not exact speed proof. Finite four times do not verify every cat pose or complete car route.',
  captures, adoption: 'PENDING_LLM_VISUAL_REVIEW' }, null, 2) + '\n');
