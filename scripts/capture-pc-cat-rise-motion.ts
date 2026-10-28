import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { catPose } from '../src/animation';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new directory with --output art-reviews/<name>; serve the current production build on 4173 first.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'cat-rise-'));
await mkdir(output, { recursive: false });
const browser = await chromium.launch({
  executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const samples: unknown[] = [];
const comparisons: unknown[] = [];
try {
  for (const [name, width, height, dpr] of ([
    ['desktop-right', 1440, 900, 1], ['desktop-left', 1440, 900, 1],
    ['fullhd-right', 1920, 1080, 1], ['fullhd-left', 1920, 1080, 1],
    ['compact-right', 800, 600, 1], ['compact-left', 800, 600, 1],
    ['mobile-right', 390, 844, 2], ['mobile-left', 390, 844, 2],
  ] as const).filter(([name]) => name === process.env.CAT_CASE)) {
    const viewport = pixelViewport(width, height, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const sceneScale = layout.motionScale * layout.composition.actorScale;
    // Discover held pose intervals through the actual production timing function.
    // Midpoints avoid the 20fps ticker's last RAF landing on a transition boundary.
    const intervals: { start: number; end: number; state: string }[] = [];
    for (let tick = 0; tick < 7200; tick++) {
      const seconds = tick / 100;
      const pose = catPose(seconds, viewport.width, sceneScale);
      const state = pose.frame === 4 ? pose.riseFrame === undefined ? pose.lookFrame === undefined ? 'neutral' : 'other' : `rise-${pose.riseFrame}` : 'other';
      const previous = intervals.at(-1);
      if (previous?.state === state) previous.end = seconds + .01;
      else intervals.push({ start: seconds, end: seconds + .01, state });
    }
    const first = intervals.findIndex(interval => interval.state === 'rise-1' && (name.endsWith('-left') ? interval.start >= 36 : interval.start < 36));
    const selected = intervals.slice(first - 1, first + 12);
    if (first < 1 || selected.map(interval => interval.state).join(',') !== 'neutral,rise-1,rise-2,rise-3,rise-4,rise-5,rise-6,rise-5,rise-4,rise-3,rise-2,rise-1,neutral') {
      throw new Error(`${name}: expected complete rise and sit cycle; inspect production timing before capture`);
    }
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('canvas[data-motion="running"]').waitFor({ state: 'attached' });
    const cdp = await page.context().newCDPSession(page);
    const x0 = Math.max(0, Math.floor(viewport.width * (name.endsWith('-left') ? .25 : .75) - 192 * .25 * sceneScale - 8));
    const y0 = Math.max(0, Math.floor(layout.catY - 208 * .25 * sceneScale - 8));
    const x1 = Math.min(viewport.width, Math.ceil(viewport.width * (name.endsWith('-left') ? .25 : .75) + 128 * .25 * sceneScale + 8));
    const y1 = Math.min(viewport.height, Math.ceil(layout.catY + 16 * .25 * sceneScale + 8));
    const crop = { x: x0 * dpr, y: y0 * dpr, width: (x1 - x0) * dpr, height: (y1 - y0) * dpr };
    const atlas = new PNG({ width: crop.width * 13, height: crop.height });
    let previousMilliseconds = 0;
    for (const [index, interval] of selected.entries()) {
      const requestedMilliseconds = Math.round((interval.start + interval.end) * 500);
      // Keep each clock operation short. fastForward would discard RAF callbacks
      // and Pixi's deltaMS clamp would prevent advancing the actual scene clock.
      while (previousMilliseconds < requestedMilliseconds) {
        const step = Math.min(1000, requestedMilliseconds - previousMilliseconds);
        await page.clock.runFor(step);
        previousMilliseconds += step;
      }
      const label = ['neutral-before', 'lean-out', 'low-out', 'crouch-out', 'tail-out', 'bridge-out', 'stand', 'bridge-back', 'tail-back', 'crouch-back', 'low-back', 'lean-back', 'neutral-after'][index]!;
      const input = `${temporary}/${name}-${label}-source.png`;
      const screenshotData = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      await writeFile(input, Buffer.from(screenshotData.data, 'base64'));
      const screenshot = PNG.sync.read(await readFile(input));
      if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > screenshot.width || crop.y + crop.height > screenshot.height) {
        throw new Error(`${name}: seated cat context crop is outside the captured canvas`);
      }
      // Copy existing screenshot pixels only; this QA atlas creates no artwork.
      PNG.bitblt(screenshot, atlas, crop.x, crop.y, crop.width, crop.height, index * crop.width, 0);
      if (label === 'stand') {
        const fullSource = `${output}/${name}-stand-source.png`;
        await copyFile(input, fullSource);
        execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
          '--input', fullSource, '--output', `${output}/${name}-stand-corrected.png`,
          '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
      }
      const expected = catPose(requestedMilliseconds / 1000, viewport.width, sceneScale);
      samples.push({ name, label, requestedSeconds: requestedMilliseconds / 1000,
        expectedFrame: expected.frame, expectedRiseFrame: expected.riseFrame ?? null,
        native: [viewport.width, viewport.height], dpr, sceneScale, catX: expected.x, footY: layout.catY,
        atlasPanel: index, cropPhysical: crop });
    }
    const changedPixels = (left: number, right: number, firstY = 0) => {
      let count = 0;
      for (let y = firstY; y < atlas.height; y++) for (let x = 0; x < crop.width; x++) {
        const a = (y * atlas.width + left * crop.width + x) * 4;
        const b = (y * atlas.width + right * crop.width + x) * 4;
        if (!atlas.data.subarray(a, a + 4).equals(atlas.data.subarray(b, b + 4))) count++;
      }
      return count;
    };
    comparisons.push({ name,
      changedFromNeutral: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(panel => changedPixels(0, panel)),
      changedLowerHalfFromNeutral: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(panel => changedPixels(0, panel, Math.ceil(atlas.height / 2))),
      changedLeanOutVsBack: changedPixels(1, 11), changedEndpoint: changedPixels(0, 12),
    });
    const atlasSource = `${output}/${name}-sequence-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
      '--input', atlasSource, '--output', `${output}/${name}-sequence-corrected.png`,
      '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard these screenshots.');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256,
  method: 'Unmodified production page on 4173. Both directions at actual scene motionScale. Paused clock before navigation, OS motion enabled after initialization and canvas running state awaited before advancing, sequential runFor steps of at most 1000ms. Sample midpoints discovered via catPose. Thirteen native cat-context crops are copied into each device sequence atlas; only standing full scenes are retained in the review directory. Other full scenes remain temporary. Requested seconds, expected poses, catX and footY are calculated geometry. Comparisons include moving background and do not prove cat-only endpoint equality; actual output is reviewed visually, with the last 20fps RAF potentially preceding the requested time.',
  samples, comparisons, adoption: 'PENDING_LLM_VISUAL_REVIEW' }, null, 2) + '\n');
// Keep sample scalars on single lines to avoid repetitive review metadata.
const capturePath = `${output}/capture.json`;
const capture = JSON.parse(await readFile(capturePath, 'utf8')) as Record<string, unknown>;
const formatted = `{\n${Object.entries(capture).map(([key, value]) =>
  `  ${JSON.stringify(key)}: ${key === 'samples' || key === 'comparisons'
    ? `[\n${(value as unknown[]).map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]`
    : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(capturePath, formatted);
