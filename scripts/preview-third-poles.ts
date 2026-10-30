import { mkdir } from 'node:fs/promises';
import { captureGeneratedArtReview } from './capture-generated-art-review';
const output = 'art-reviews/2026-10-30-third-poles-local';
await mkdir(output, { recursive: false });
await captureGeneratedArtReview({ output, entryPath: '/scripts/third-pole-review-entry.ts', exportName: 'renderFractionalPoles', width: 1280, height: 1280 });
