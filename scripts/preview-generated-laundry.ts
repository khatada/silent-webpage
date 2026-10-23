import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-laundry-review-entry.ts', exportName: 'renderGeneratedLaundryReview',
  width: 1120, height: 1248 });
