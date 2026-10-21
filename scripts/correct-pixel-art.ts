import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { correctPixelArt, validateImageSize } from '../src/pixel-correction';

const { values } = parseArgs({ options: {
  input: { type: 'string' }, output: { type: 'string' },
  'cell-size': { type: 'string' }, 'offset-x': { type: 'string', default: '0' },
  'offset-y': { type: 'string', default: '0' }, scale: { type: 'string', default: '1' },
} });
if (!values.input || !values.output || !values['cell-size']) {
  throw new Error('Usage: npm run art:correct -- --input source.png --output corrected.png --cell-size 2.25 [--offset-x 0 --offset-y 0 --scale 2]');
}
const inputPath = resolve(values.input);
const outputPath = resolve(values.output);
if (inputPath === outputPath) throw new Error('Use a different output path to preserve the original image.');
if ((await stat(inputPath)).size > 64 * 1024 * 1024) throw new Error('Input file exceeds 64 MiB.');
const source = await readFile(inputPath);
if (source.length < 24 || !source.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
  throw new Error('Input must be a PNG image.');
}
// Reject oversized decoded images before pngjs allocates their pixel buffers.
validateImageSize(source.readUInt32BE(16), source.readUInt32BE(20));
const decoded = PNG.sync.read(source);
const options = { cellSize: Number(values['cell-size']), offsetX: Number(values['offset-x']),
  offsetY: Number(values['offset-y']), outputScale: Number(values.scale) };
const corrected = correctPixelArt(decoded, options);
const result = new PNG({ width: corrected.width, height: corrected.height });
result.data = Buffer.from(corrected.data);
const output = PNG.sync.write(result);
await writeFile(outputPath, output, { flag: 'wx' });
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const report = {
  input: { path: inputPath, width: decoded.width, height: decoded.height, sha256: sha256(source) },
  output: { path: outputPath, width: corrected.width, height: corrected.height, sha256: sha256(output) },
  grid: options,
  method: 'Dominant original RGBA per declared cell; center-distance tie break; integer nearest-neighbor expansion.',
  edges: 'Partial edge cells cropped.',
  limitations: 'Uniform grid only; no automatic grid inference or local warp repair.',
  adoption: 'PENDING_LLM_VISUAL_REVIEW: correction never automatically approves an image.',
};
await writeFile(`${outputPath}.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
