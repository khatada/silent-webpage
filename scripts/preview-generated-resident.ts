import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-resident-review-entry.ts', exportName: 'renderGeneratedResidentReview',
  width: 1536, height: 1152 });

await formatReviewMetadata(`${values.output}/atlas-capture.json`);
