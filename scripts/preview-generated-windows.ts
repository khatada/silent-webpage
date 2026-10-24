import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { captureGeneratedArtReview } from './capture-generated-art-review';
import { formatReviewMetadata } from './format-review-metadata';
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
for (const [name, exportName] of [['normal', 'renderNormalWindows'], ['wide', 'renderWideWindows'],
  ['portrait', 'renderPortraitWindows']]) {
  const output = join(values.output, name);
  await mkdir(output);
  await captureGeneratedArtReview({ output, entryPath: '/scripts/generated-window-review-entry.ts',
    exportName, width: 1152, height: 1536 });
  await formatReviewMetadata(join(output, 'atlas-capture.json'));
}
