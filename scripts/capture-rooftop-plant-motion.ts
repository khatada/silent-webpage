import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium, type Page } from '@playwright/test';
import { catPose } from '../src/animation';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { plantGeometry } from '../src/image-plant';
import { plantFrame } from '../src/plant-timing';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new --output directory; serve the frozen production build on 4173 first.');
const output = values.output;
const temporary = await mkdtemp(join(tmpdir(), 'rooftop-plant-'));
const sourceSha256 = await artSourceHash();
await mkdir(output, { recursive: false });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const samples: unknown[] = [], layouts: unknown[] = [], comparisons: unknown[] = [];
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
async function screenshot(page: Page, name: string) {
  const path = `${temporary}/${name}.png`;
  await page.locator('canvas').screenshot({ path, style: '.settings-open{visibility:hidden!important}' });
  return { path, image: PNG.sync.read(await readFile(path)) };
}
function changedPixels(a: PNG, b: PNG) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('Image sizes differ');
  let count = 0;
  for (let i = 0; i < a.data.length; i += 4) if (!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) count++;
  return count;
}
try {
  for (const [name, cssWidth, cssHeight, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['landscape', 844, 390, 2],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const geometry = plantGeometry(layout, viewport.width, viewport.height);
    if (!geometry.visible) throw new Error(`${name}: plant should be visible in representative layout`);
    const actorScale = layout.scale * layout.composition.actorScale;
    const crop = {
      x: Math.floor(geometry.x - geometry.width / 2 - 48) * dpr,
      y: Math.floor(geometry.top - 16) * dpr,
      width: Math.ceil(geometry.width + 96) * dpr,
      height: Math.ceil(Math.max(geometry.bottom, layout.catY) - Math.floor(geometry.top - 16) + 16) * dpr,
    };
    const times = [0, 5.5, 8, 12, 15];
    if (name === 'landscape') {
      let overlapTime = 0, distance = Infinity;
      for (let tick = 1; tick < 300; tick++) {
        const seconds = tick / 20;
        const pose = catPose(seconds, viewport.width, actorScale);
        if (pose.frame >= 4) continue;
        const current = Math.abs(pose.x - geometry.x);
        if (current < distance) { distance = current; overlapTime = seconds; }
      }
      times.push(overlapTime);
      times.sort((a, b) => a - b);
    }
    layouts.push({ name, native: [viewport.width, viewport.height], dpr, geometry,
      catFootY: layout.catY, depthGap: layout.catY - geometry.footY, cropPhysical: crop, times });
    const atlas = new PNG({ width: crop.width * times.length, height: crop.height });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let sceneMilliseconds = 0;
    async function advance(milliseconds: number) {
      while (sceneMilliseconds < milliseconds) {
        const step = Math.min(1000, milliseconds - sceneMilliseconds);
        await page.clock.runFor(step);
        sceneMilliseconds += step;
      }
    }
    function extract(image: PNG) {
      if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > image.width || crop.y + crop.height > image.height) throw new Error(`${name}: context crop outside canvas`);
      const result = new PNG({ width: crop.width, height: crop.height });
      PNG.bitblt(image, result, crop.x, crop.y, crop.width, crop.height, 0, 0);
      return result;
    }
    for (const [panel, seconds] of times.entries()) {
      await advance(Math.round(seconds * 1000));
      const shot = await screenshot(page, `${name}-${seconds}`);
      const context = extract(shot.image);
      PNG.bitblt(context, atlas, 0, 0, context.width, context.height, panel * crop.width, 0);
      const pose = catPose(seconds, viewport.width, actorScale);
      samples.push({ name, panel, requestedSceneSeconds: seconds, calculatedPlantFrame: plantFrame(seconds),
        calculatedCatX: pose.x, calculatedCatFrame: pose.frame, overlapProbe: ![0, 5.5, 8, 12, 15].includes(seconds) });
      if (seconds === 5.5) {
        const fullSource = `${output}/${name}-active-source.png`;
        await copyFile(shot.path, fullSource);
        correct(fullSource, `${output}/${name}-active-corrected.png`, dpr);
      }
      if (name === 'mobile' && seconds === 5.5) {
        async function setReduced(checked: boolean) {
          await page.getByRole('button', { name: '設定を開く' }).click();
          await page.getByRole('checkbox', { name: '動きを減らす' }).setChecked(checked);
          await page.getByRole('button', { name: '設定を閉じる' }).click();
        }
        await setReduced(true);
        const pausedBefore = await screenshot(page, 'mobile-paused-before');
        await page.clock.runFor(1000); // Wall time advances, the production scene must remain stopped.
        const pausedAfter = await screenshot(page, 'mobile-paused-after');
        const pausedChanged = changedPixels(pausedBefore.image, pausedAfter.image);
        if (pausedChanged !== 0) throw new Error(`Stopped scene changed ${pausedChanged} pixels`);
        await setReduced(false);
        await advance(6500);
        const resumedLeft = await screenshot(page, 'mobile-resumed-left');
        await advance(7500);
        const resumedNeutral = await screenshot(page, 'mobile-resumed-neutral');
        const shots = [pausedBefore, pausedAfter, resumedLeft, resumedNeutral];
        const stoppedAtlas = new PNG({ width: crop.width * shots.length, height: crop.height });
        const contexts = shots.map(shot => extract(shot.image));
        contexts.forEach((image, panel) => PNG.bitblt(image, stoppedAtlas, 0, 0, image.width, image.height, panel * crop.width, 0));
        const stoppedSource = `${output}/mobile-stop-resume-source.png`;
        await writeFile(stoppedSource, PNG.sync.write(stoppedAtlas));
        correct(stoppedSource, `${output}/mobile-stop-resume-corrected.png`, dpr);
        comparisons.push({ name, pausedWholeCanvasChangedPixels: pausedChanged, pausedWallSeconds: 1,
          requestedSceneSeconds: [5.5, 5.5, 6.5, 7.5], calculatedPlantFrames: [5.5, 5.5, 6.5, 7.5].map(plantFrame),
          changedPlantContextPausedVsResumedLeft: changedPixels(contexts[0]!, contexts[2]!),
          changedPlantContextResumedLeftVsNeutral: changedPixels(contexts[2]!, contexts[3]!) });
      }
    }
    if (name === 'landscape') {
      const leftPanel = times.indexOf(5.5), overlapPanel = times.findIndex(seconds => ![0, 5.5, 8, 12, 15].includes(seconds));
      const box = { x: Math.floor(geometry.x - geometry.width / 2) * dpr - crop.x,
        y: Math.floor(geometry.top) * dpr - crop.y, width: Math.ceil(geometry.width) * dpr,
        height: (Math.ceil(geometry.bottom) - Math.floor(geometry.top)) * dpr };
      let changed = 0, changedLowerHalf = 0;
      for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
        const a = ((box.y + y) * atlas.width + leftPanel * crop.width + box.x + x) * 4;
        const b = ((box.y + y) * atlas.width + overlapPanel * crop.width + box.x + x) * 4;
        if (!atlas.data.subarray(a, a + 4).equals(atlas.data.subarray(b, b + 4))) {
          changed++; if (y >= box.height / 2) changedLowerHalf++;
        }
      }
      comparisons.push({ name, samePlantFrameComparisonSeconds: [5.5, times[overlapPanel]],
        plantBoxWithinPanelPhysical: box, changedPixels: changed, changedLowerHalfPixels: changedLowerHalf,
        interpretation: 'Cat passing in front changes the lower plant rectangle; this is occlusion evidence, not a fixed-pixel invariance claim.' });
    }
    const atlasSource = `${output}/${name}-sequence-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-sequence-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture');
const capture = { sourceSha256,
  method: 'Unmodified production page; paused clock before navigation, real settings UI pause/resume, runFor steps <=1000ms. Requested scene seconds and expected states are calculated, last 20fps RAF may precede the requested time. Native atlas panels only copy existing production screenshots. Cat occlusion may change plant-context pixels and is reviewed visually, not treated as a failure.',
  layouts, samples, comparisons, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
