import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide output');
await captureGeneratedArtReview({ output: values.output, entryPath: '/scripts/windsock-review-entry.ts', exportName: 'renderWindsockReview', width: 960, height: 420 });
