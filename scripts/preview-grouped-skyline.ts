import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
import { wideFineArt } from '../src/wide-fine-art';
const root = 'art-reviews/2026-10-28-grouped-skyline';
await mkdir(root, { recursive: true });
for (const scale of ['half', 'one', 'two', 'four']) {
  const output = join(root, scale); await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/grouped-skyline-review-entry.ts',
    exportName: scale, width: 512, height: wideFineArt.skylineGroups.length * 128 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
