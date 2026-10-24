import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
import { starScenes } from '../src/image-stars';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
for (const [composition, name] of ['normal', 'wide', 'portrait'].entries()) for (let group = 0; group < Math.ceil(starScenes[composition].length / 5); group++) {
  const output = join(values.output, `${name}-${group}`);
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/generated-stars-review-entry.ts',
    exportName: `render${name[0].toUpperCase()}${name.slice(1)}Stars${group}`, width: 384, height: 1200 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
