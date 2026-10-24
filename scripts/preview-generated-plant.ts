import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-plant-review-entry.ts', exportName: 'renderGeneratedPlantReview',
  width: 1000, height: 1800 });
await formatReviewMetadata(`${values.output}/atlas-capture.json`);
