import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
import { wideFineArt } from '../src/wide-fine-art';

const root = 'art-reviews/2026-10-28-wide-skyline-expansion';
await mkdir(root, { recursive: true });
for (const scale of ['Half', 'One', 'Two', 'Four']) {
  const output = join(root, scale.toLowerCase());
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/wide-fine-review-entry.ts',
    exportName: `skyline${scale}`, width: 512, height: wideFineArt.skylineCores.length * 128 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
