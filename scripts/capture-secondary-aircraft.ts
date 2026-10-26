import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { generatedArt } from '../src/generated-art';
import { pixelViewport } from '../src/pixel-viewport';
import { travelPosition } from '../src/animation';
import { cityMotion } from '../src/city-motion';
import { oppositeAircraftArt, oppositeAircraftGeometry } from '../src/opposite-aircraft';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new --output directory and serve the frozen production build on 4173.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'secondary-aircraft-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const layouts: unknown[] = [], samples: unknown[] = [];
try {
  for (const [name, cssWidth, cssHeight, dpr, expectedVisible] of [
    ['desktop', 1440, 900, 1, true], ['tall', 390, 1025, 2, true],
    ['small-phone', 320, 568, 2, true], ['mobile', 390, 844, 2, false],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const opposite = oppositeAircraftGeometry(viewport.width, layout);
    if (opposite.visible !== expectedVisible) throw new Error(`${name}: unexpected opposite-flight visibility; update review expectations explicitly.`);
    const primaryWidth = generatedArt.frames.aircraft[2] * layout.aircraftScale;
    const primaryHeight = generatedArt.frames.aircraft[3] * layout.aircraftScale;
    const speed = layout.scale * cityMotion.aircraftSpeed;
    const initialX = viewport.width * oppositeAircraftArt.initialFraction;
    const firstLeftWrapSeconds = opposite.visible ? (initialX + opposite.width) / speed : null;
    const times = [0, 1, 4];
    if (firstLeftWrapSeconds !== null) times.push(Math.max(0, firstLeftWrapSeconds - .1),
      firstLeftWrapSeconds + .1, firstLeftWrapSeconds + 1, firstLeftWrapSeconds + opposite.width / speed + .5);
    const selected = [...new Set(times.map(seconds => Math.round(seconds * 1000) / 1000))].sort((a, b) => a - b);
    const skyTop = Math.max(0, Math.floor(Math.min(layout.aircraftY,
      opposite.visible ? opposite.y : layout.aircraftY) - 8));
    const skyBottom = Math.min(viewport.height, Math.ceil(Math.max(layout.aircraftY + primaryHeight,
      opposite.visible ? opposite.y + opposite.height : layout.aircraftY + primaryHeight) + 8));
    const skyHeight = skyBottom - skyTop;
    const atlasWidth = viewport.width * dpr, atlasHeight = skyHeight * dpr * selected.length;
    if (atlasWidth * atlasHeight > 16_000_000) throw new Error(`${name}: review atlas exceeds 16MP; split native strips.`);
    const atlas = new PNG({ width: atlasWidth, height: atlasHeight });
    layouts.push({ name, native: [viewport.width, viewport.height], dpr,
      calculatedPrimary: { width: primaryWidth, height: primaryHeight, y: layout.aircraftY, speed, initialX: viewport.width * .7 },
      calculatedOpposite: { ...opposite, speed: -speed, initialX }, firstLeftWrapSeconds,
      cropNative: [0, skyTop, viewport.width, skyHeight], atlasTimes: selected,
      atlasPhysical: [atlasWidth, atlasHeight] });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let previous = 0;
    for (const [panel, seconds] of selected.entries()) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const input = `${temporary}/${name}-${seconds}.png`;
      await page.locator('canvas').screenshot({ path: input, style: '.settings-open{visibility:hidden!important}' });
      const screenshot = PNG.sync.read(await readFile(input));
      if (screenshot.width !== viewport.width * dpr || screenshot.height !== viewport.height * dpr) {
        throw new Error(`${name}: screenshot dimensions differ from the native/DPR crop assumptions.`);
      }
      // Copy unchanged production pixels only, full native width and both aircraft lanes.
      PNG.bitblt(screenshot, atlas, 0, skyTop * dpr, screenshot.width, skyHeight * dpr,
        0, panel * skyHeight * dpr);
      if (seconds === 4) {
        const fullSource = `${output}/${name}-4-source.png`;
        await copyFile(input, fullSource);
        correct(fullSource, `${output}/${name}-4-corrected.png`, dpr);
      }
      samples.push({ name, panel, requestedSceneSeconds: seconds,
        calculatedPrimaryLeftX: travelPosition(seconds, viewport.width, primaryWidth, speed, viewport.width * .7),
        calculatedOppositeLeftX: opposite.visible ? travelPosition(seconds, viewport.width, opposite.width, -speed, initialX) : null });
    }
    const atlasSource = `${output}/${name}-sky-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-sky-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
const finalSourceSha256 = await artSourceHash();
if (sourceSha256 !== finalSourceSha256) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256, finalSourceSha256,
  method: 'Unmodified production page. Clock paused before navigation; OS motion enabled after initialization; runFor steps <=1000ms. Full-width native sky strips include primary and opposite lanes at requested 0/1/4s plus first-left-wrap -.1/+.1/+1s and full-width/speed+.5s after reentry when visible. 4s full scenes are retained for all four devices. Geometry, visibility, wrap timing and positions are calculated expectations, not pixel-measured motion. The actual last 20fps RAF may precede requested time. Mirrored anchor1/-scale uses the left bound as x. Mobile omission, leftward movement, lane separation and edge-only reentry require actual LLM image review.',
  layouts, samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
