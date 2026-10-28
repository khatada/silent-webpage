import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { starCoreSampled, starScenes } from '../src/image-stars';
import { skylineLightScenes } from '../src/image-skyline-lights';
import { starDarkness } from '../src/star-timing';
import { skylineLightDarkness } from '../src/skyline-light-timing';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new --output directory; serve the frozen production build on 4173 first.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'random-city-lights-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const times = [0, 2, 4, 6, 8, 18, 22, 26, 30];
const layouts: unknown[] = [], samples: unknown[] = [];
try {
  for (const [name, cssWidth, cssHeight, dpr, expectedComposition] of [
    ['wide', 2560, 1080, 1, 1], ['compact', 800, 600, 1, 1],
    ['landscape', 844, 390, 2, 1],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const composition = layout.portrait ? 2 : layout.wide ? 1 : 0;
    if (composition !== expectedComposition) throw new Error(`${name}: unexpected composition`);
    const bandBottom = Math.min(viewport.height, Math.ceil(layout.railBottom));
    const width = viewport.width * dpr, height = bandBottom * dpr;
    if (width * height * times.length > 16_000_000) throw new Error(`${name}: atlas exceeds 16MP`);
    const atlas = new PNG({ width, height: height * times.length });
    const visibleCore = (rectangle: readonly number[], index: number) => {
      const [x, y, w, h] = rectangle;
      const native = [layout.originX + x * layout.scale, layout.originY + y * layout.scale,
        w * layout.scale, h * layout.scale];
      return { index, native };
    };
    const contained = ({ native: [x, y, w, h] }: { native: number[] }) =>
      x >= 0 && y >= 0 && x + w <= viewport.width && y + h <= bandBottom;
    const stars = starScenes[composition].map(({ core }, index) => ({ ...visibleCore(core, index),
      sampled: starCoreSampled(core[0], core[1], layout.scale) })).filter(core => core.sampled && contained(core));
    const windows = skylineLightScenes[composition].map(({ lit }, index) => visibleCore(lit, index)).filter(contained);
    if (!stars.length || !windows.length) throw new Error(`${name}: no visible review cores`);
    layouts.push({ name, composition, native: [viewport.width, viewport.height], dpr,
      calculatedTransform: [layout.originX, layout.originY, layout.scale],
      calculatedSkyBottom: layout.skyBottom, calculatedRailBottom: layout.railBottom,
      cropNative: [0, 0, viewport.width, bandBottom], atlasPhysical: [width, height * times.length],
      calculatedVisibleStarCores: stars.map(({ index, native }) => ({ index, native })),
      calculatedVisibleWindowCores: windows });
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
    let previous = 0;
    for (const [panel, seconds] of times.entries()) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const input = `${temporary}/${name}-${seconds}.png`;
      await page.locator('canvas').screenshot({ path: input });
      const screenshot = PNG.sync.read(await readFile(input));
      if (screenshot.width !== width || screenshot.height !== viewport.height * dpr) throw new Error(`${name}: screenshot dimensions differ`);
      // Copy production screenshot pixels only; no artwork is drawn for this QA atlas.
      PNG.bitblt(screenshot, atlas, 0, 0, width, height, 0, panel * height);
      if (seconds === 4) {
        const fullSource = `${output}/${name}-4-source.png`;
        await copyFile(input, fullSource);
        correct(fullSource, `${output}/${name}-4-corrected.png`, dpr);
      }
      samples.push({ name, panel, requestedSceneSeconds: seconds,
        calculatedStarDarkness: stars.map(({ index }) => starDarkness(seconds, index, composition)),
        calculatedWindowDarkness: windows.map(({ index }) => skylineLightDarkness(seconds, index, composition)) });
    }
    const atlasSource = `${output}/${name}-skyline-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-skyline-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
const finalSourceSha256 = await artSourceHash();
if (sourceSha256 !== finalSourceSha256) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256, finalSourceSha256, times,
  method: 'Unmodified production page. Clock paused before navigation, reduced motion removed after readiness, canvas running state awaited, runFor steps <=1000ms. Nine full-width native sky/building bands run from y0 through generatedLayout railBottom, stacked in times order. Only 4s full scenes are retained. Core rectangles and sampling eligibility are calculated geometry, not pixel-measured visibility; passing clouds/aircraft can occlude them. Darkness arrays match the visible core index order in layouts and are calculated at requested seconds, not measured pixel timing. The last 20fps RAF may precede requested time. These screenshot crops create no original art. Correction uses cell-size=dpr and scale=dpr. Actual LLM review decides adoption; finite samples do not prove every event is unique or establish a subjective continuous-motion impression.',
  layouts, samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
