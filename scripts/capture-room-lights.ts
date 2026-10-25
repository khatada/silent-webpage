import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { windowBrightness } from '../src/animation';
import { residentialLightCycle } from '../src/city-motion';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' }, 'skip-wide': { type: 'boolean', default: false } } });
if (!values.output) throw new Error('Provide a new --output directory and serve the frozen production build on 4173.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'room-lights-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const layouts: unknown[] = [], samples: unknown[] = [];
try {
  for (const [name, cssWidth, cssHeight, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2],
    ['landscape', 844, 390, 2], ['portrait-large', 900, 1600, 1],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const composition = layout.portrait ? 'portrait' : layout.wide ? 'wide' : 'normal';
    if (values['skip-wide'] && composition === 'wide') continue;
    const sourceRect = layout.portrait ? [514, 932, 47, 38] : layout.wide ? [478, 169, 18, 24] : [380, 288, 30, 28];
    const index = layout.portrait ? 0 : layout.wide ? 6 : 1;
    const { phase, period } = residentialLightCycle(index);
    const wrap = (time: number) => ((time % period) + period) % period;
    const secondsUntil = (cycleTime: number) => wrap(cycleTime - phase);
    const edge = period * .57;
    const initial = windowBrightness(0, phase, period);
    const states = [
      { state: 'on', seconds: initial === 1 ? 0 : secondsUntil(1.2) },
      { state: 'mid', seconds: Math.min(secondsUntil(.45), secondsUntil(edge + .45)) },
      { state: 'off', seconds: initial === 0 ? 0 : secondsUntil(edge + 1.2) },
    ].map(row => ({ ...row, seconds: Math.round(row.seconds * 1000) / 1000 })).sort((a, b) => a.seconds - b.seconds);
    if (states.some(row => row.seconds > 20)) throw new Error(`${name}: sampling exceeds the short capture window`);
    const [sx, sy, sw, sh] = sourceRect;
    const left = Math.max(0, Math.floor(layout.originX + sx * layout.scale));
    const top = Math.max(0, Math.floor(layout.originY + sy * layout.scale));
    const right = Math.min(viewport.width, Math.ceil(layout.originX + (sx + sw) * layout.scale));
    const bottom = Math.min(viewport.height, Math.ceil(layout.originY + (sy + sh) * layout.scale));
    const crop = { x: left * dpr, y: top * dpr, width: (right - left) * dpr, height: (bottom - top) * dpr };
    if (crop.width <= 0 || crop.height <= 0) throw new Error(`${name}: room crop is offscreen`);
    const atlas = new PNG({ width: crop.width, height: crop.height * states.length });
    layouts.push({ name, composition, native: [viewport.width, viewport.height], dpr, scale: layout.scale,
      roomCycleIndex: index, phase, period, sourceRect, physicalCrop: crop,
      atlasOrder: states.map(row => row.state) });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let previous = 0;
    for (const [panel, { state, seconds }] of states.entries()) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const input = `${temporary}/${name}-${state}.png`;
      await page.locator('canvas').screenshot({ path: input, style: '.settings-open{visibility:hidden!important}' });
      const screenshot = PNG.sync.read(await readFile(input));
      if (crop.x + crop.width > screenshot.width || crop.y + crop.height > screenshot.height) throw new Error(`${name}: screenshot dimensions differ`);
      // Copy actual production pixels at native resolution. No original artwork is created.
      PNG.bitblt(screenshot, atlas, crop.x, crop.y, crop.width, crop.height, 0, panel * crop.height);
      if (state === 'off') {
        const fullSource = `${output}/${name}-off-source.png`;
        await copyFile(input, fullSource);
        correct(fullSource, `${output}/${name}-off-corrected.png`, dpr);
      }
      samples.push({ name, panel, state, requestedSceneSeconds: seconds,
        calculatedRoomBrightness: windowBrightness(seconds, phase, period) });
    }
    const atlasSource = `${output}/${name}-room-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-room-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256,
  method: 'Unmodified production page; clock paused before navigation, motion enabled after initialization, runFor steps <=1000ms. On/off samples include 0.3s fade hold margin; intermediate brightness is calculated at the requested time, not measured exact RAF state. The final 20fps RAF may precede the requested time. Native screenshot crops show the room and surrounding frame/railing at three states; the off-state whole scene is retained. These are rendered screenshot copies, not generated original artwork. LLM visual review decides adoption.',
  layouts, samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
