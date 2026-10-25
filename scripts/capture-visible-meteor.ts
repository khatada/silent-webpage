import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { meteorGeometry } from '../src/image-meteor';
import { meteorState } from '../src/meteor-timing';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new --output directory and serve the frozen production build on 4173.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'visible-meteor-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const layouts: unknown[] = [], samples: unknown[] = [];
try {
  for (const [name, cssWidth, cssHeight, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['landscape', 844, 390, 2],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const geometry = meteorGeometry(viewport.width, layout.skyBottom);
    const skyHeight = Math.min(viewport.height, Math.ceil(layout.skyBottom));
    const atlas = new PNG({ width: viewport.width * dpr, height: skyHeight * dpr * 3 });
    layouts.push({ name, native: [viewport.width, viewport.height], dpr, skyHeight,
      calculatedMeteorGeometry: geometry, atlasOrder: 'Top to bottom: 3.3s, 4s, 4.7s full-width native sky strips' });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let previous = 0;
    for (const [panel, seconds] of [3.3, 4, 4.7].entries()) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const input = `${temporary}/${name}-${seconds}.png`;
      await page.locator('canvas').screenshot({ path: input, style: '.settings-open{visibility:hidden!important}' });
      const screenshot = PNG.sync.read(await readFile(input));
      // Copy existing production screenshot pixels only; no artwork is generated.
      PNG.bitblt(screenshot, atlas, 0, 0, screenshot.width, skyHeight * dpr, 0, panel * skyHeight * dpr);
      if (seconds === 4) {
        const fullSource = `${output}/${name}-4-source.png`;
        await copyFile(input, fullSource);
        correct(fullSource, `${output}/${name}-4-corrected.png`, dpr);
      }
      samples.push({ name, panel, requestedSceneSeconds: seconds, calculatedMeteorState: meteorState(seconds) });
    }
    const atlasSource = `${output}/${name}-sky-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-sky-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256,
  method: 'Unmodified production page with clock paused before navigation, OS motion enabled after initialization and runFor steps <=1000ms. 4s full scenes are retained; native sky strips at 3.3/4/4.7s are copied into per-device atlases. Other full scenes remain temporary. Computed state/geometry are expectations; actual last 20fps RAF may precede requested time. Meteor independence from clouds and visible tail/movement require actual LLM image review.',
  layouts, samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
