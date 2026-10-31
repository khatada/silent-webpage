import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory.');
await captureGeneratedArtReview({ output: values.output, entryPath: '/scripts/wide-resident-review-entry.ts',
  exportName: 'renderWideResidentReview', width: 1536, height: 624 });
