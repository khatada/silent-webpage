import { mkdir } from 'node:fs/promises';
import { captureGeneratedArtReview } from './capture-generated-art-review';
const output = 'art-reviews/2026-10-29-train-alternation-local-v2';
await mkdir(output, { recursive: false });
await captureGeneratedArtReview({ output, entryPath: '/scripts/train-alternation-review-entry.ts', exportName: 'renderTrainAlternation', width: 1280, height: 1280 });
