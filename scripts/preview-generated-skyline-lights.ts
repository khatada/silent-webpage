import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
for (const [name, exportName] of [['normal', 'renderNormalSkylineLights'], ['wide', 'renderWideSkylineLights'],
  ['portrait', 'renderPortraitSkylineLights']]) {
  const output = join(values.output, name);
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/generated-skyline-lights-review-entry.ts',
    exportName, width: 448, height: 1728 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
