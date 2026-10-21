import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new directory with --output art-reviews/<name>. Serve preview on port 4173 first.');
// Capture the exact current build; verify is run after the LLM records adoption.
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
await mkdir(values.output, { recursive: false });
const sourceSha256 = await artSourceHash();
const browser = await chromium.launch({
  executablePath: process.env.ART_BROWSER_PATH || undefined,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  for (const [name, width, height, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['narrow', 295, 844, 1],
    ['landscape', 844, 390, 2], ['wide', 2560, 1080, 1],
    ['compact', 800, 600, 1], ['tall', 390, 1025, 2],
    ['portrait-large', 900, 1600, 1], ['portrait-boundary', 1024, 1537, 1],
    ['small-phone', 320, 568, 2], ['small-mobile', 375, 667, 2],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    const input = `${values.output}/${name}-source.png`;
    const output = `${values.output}/${name}-corrected.png`;
    await page.locator('canvas').screenshot({ path: input });
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
      '--input', input, '--output', output, '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'inherit' });
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Source changed during capture; discard these captures.');
await writeFile(`${values.output}/capture.json`, JSON.stringify({ sourceSha256, adoption: 'PENDING_LLM_VISUAL_REVIEW' }, null, 2) + '\n');
console.log('Open each corrected PNG with an image viewer, then record the LLM adoption decision. No image was automatically accepted.');
