import { parseArgs } from 'node:util';
import { captureGeneratedArtReview } from './capture-generated-art-review';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
await captureGeneratedArtReview({ output: values.output,
  entryPath: '/scripts/generated-steam-review-entry.ts', exportName: 'renderGeneratedSteamReview',
  width: 1344, height: 1440 });
