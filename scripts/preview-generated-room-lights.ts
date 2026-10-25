import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing new output directory.');
await captureGeneratedArtReview({ output: values.output, entryPath: '/scripts/generated-room-light-review-entry.ts',
  exportName: 'renderGeneratedRoomLightReview', width: 640, height: 1440 });
await formatReviewMetadata(join(values.output, 'atlas-capture.json'));
