import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { artSourceHash } from './art-source-hash';
import { PNG } from 'pngjs';
import { correctPixelArt } from '../src/pixel-correction';

interface GenerationEvidence {
  tool: 'image_gen.imagegen';
  originalSha256: string;
  prompt: string;
}
interface ReviewImage {
  image: string;
  report: string;
  decision: string;
  reviewedBy: string;
  reason: string;
  generation?: GenerationEvidence;
}
const manifest = JSON.parse(await readFile('art-reviews/manifest.json', 'utf8')) as {
  sourceSha256: string; images: ReviewImage[];
};
if (manifest.sourceSha256 !== await artSourceHash()) throw new Error('Art source changed: recapture, correct and visually review images before adoption.');
if (!manifest.images?.length) throw new Error('At least one corrected image needs an LLM adoption record.');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const accepted = new Set<string>();
const generated = new Set<string>();
for (const review of manifest.images) {
  if (review.decision !== 'accepted' || review.reviewedBy !== 'LLM' || !review.reason?.trim()) throw new Error(`Missing LLM adoption decision: ${review.image}`);
  const report = JSON.parse(await readFile(review.report, 'utf8'));
  if (review.generation !== undefined) {
    const evidence = review.generation;
    if (evidence?.tool !== 'image_gen.imagegen'
      || typeof evidence.originalSha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(evidence.originalSha256)
      || evidence.originalSha256 !== report.input.sha256
      || typeof evidence.prompt !== 'string' || !evidence.prompt.trim()) {
      throw new Error(`Invalid image generation evidence: ${review.image}`);
    }
    generated.add(resolve(review.image));
  }
  const image = await readFile(review.image);
  if (hash(image) !== report.output.sha256) throw new Error(`Corrected image differs from its report: ${review.image}`);
  // Original PNGs are retained beside the corrected image, making evidence portable.
  const original = await readFile(report.input.path);
  if (hash(original) !== report.input.sha256) throw new Error(`Original image differs from its report: ${review.image}`);
  const expected = correctPixelArt(PNG.sync.read(original), report.grid);
  const decoded = PNG.sync.read(image);
  if (expected.width !== decoded.width || expected.height !== decoded.height
    || !Buffer.from(expected.data).equals(decoded.data)) throw new Error(`Image is not the declared correction: ${review.image}`);
  accepted.add(resolve(review.image));
}
async function inspectPublic(path: string): Promise<void> {
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await inspectPublic(child);
    else if (/\.png$/i.test(entry.name)) {
      if (!accepted.has(resolve(child))) throw new Error(`Unreviewed public PNG: ${relative('.', child)}`);
      if (!generated.has(resolve(child))) throw new Error(`Missing image generation evidence for public PNG: ${relative('.', child)}`);
    }
  }
}
await inspectPublic('public');
console.log(`Pixel art: source and ${accepted.size} corrected, LLM-reviewed images verified.`);
