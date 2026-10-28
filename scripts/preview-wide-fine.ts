import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide --output art-reviews/<new-name>.');
await mkdir(values.output, { recursive: true });
for (const kind of ['windows', 'skyline', 'stars']) for (const scale of ['Half', 'One', 'Two', 'Four']) {
  const output = join(values.output, `${kind}-${scale.toLowerCase()}`);
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/wide-fine-review-entry.ts',
    exportName: `${kind}${scale}`, width: 512, height: (kind === 'windows' ? 9 : kind === 'skyline' ? 6 : 16) * 128 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
