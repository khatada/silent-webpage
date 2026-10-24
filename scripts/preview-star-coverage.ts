import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output, entryPath: '/scripts/generated-star-coverage-entry.ts',
  exportName: 'renderStarCoverage', width: 192, height: 1700 });
await formatReviewMetadata(join(values.output, 'atlas-capture.json'));
