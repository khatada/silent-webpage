import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-cat-look-review-entry.ts', exportName: 'renderGeneratedCatLookReview',
  width: 1000, height: 2400 });

await formatReviewMetadata(`${values.output}/atlas-capture.json`);
