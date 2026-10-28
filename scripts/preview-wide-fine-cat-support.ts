import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide --output art-reviews/<new-name>.');
await mkdir(values.output, { recursive: true });
for (const direction of ['Right', 'Left']) {
  const output = join(values.output, direction.toLowerCase());
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/wide-fine-cat-support-entry.ts',
    exportName: `support${direction}`, width: 1040, height: 1408 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
