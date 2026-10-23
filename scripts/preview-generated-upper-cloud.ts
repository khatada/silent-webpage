import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { formatReviewMetadata } from './format-review-metadata';
import { captureGeneratedArtReview } from './capture-generated-art-review';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-upper-cloud-review-entry.ts', exportName: 'renderGeneratedUpperCloudReview',
  width: 1050, height: 2300 });
await formatReviewMetadata(join(values.output, 'atlas-capture.json'));
