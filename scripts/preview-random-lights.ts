import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/random-lights-review-entry.ts', exportName: 'renderRandomLightsReview',
  width: 640, height: 672 });
await formatReviewMetadata(`${values.output}/atlas-capture.json`);
