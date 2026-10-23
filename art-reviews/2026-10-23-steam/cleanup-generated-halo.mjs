import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const root = 'art-reviews/2026-10-23-steam/';
const inputPath = `${root}rejected-halo-source.png`;
const outputPath = `${root}source-cleaned.png`;
const input = await readFile(inputPath);
const png = PNG.sync.read(input);
let kept = 0, removed = 0;
for (let i = 0; i < png.data.length; i += 4) {
  if (png.data[i + 3] >= 128 && Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) >= 96) kept++;
  else { if (png.data[i + 3]) removed++; png.data.fill(0, i, i + 4); }
}
const output = PNG.sync.write(png);
await writeFile(outputPath, output, { flag: 'wx' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await writeFile(`${root}cleanup-report.json`, JSON.stringify({input:inputPath,output:outputPath,inputSha256:hash(input),outputSha256:hash(output),settings:{minimumAlpha:128,minimumMaximumRgb:96},method:'Partial edit of imagegen artwork: retain original RGBA only at existing pixels satisfying both thresholds; clear all other pixels. No new pixels or colors.',kept,removed,adoption:'PENDING_LLM_VISUAL_REVIEW'},null,2)+'\n',{flag:'wx'});
console.log({kept,removed,inputSha256:hash(input),outputSha256:hash(output)});
