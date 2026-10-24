import { readFile, writeFile } from 'node:fs/promises';

/** Keep each sample/layout on one line while leaving capture structure readable. */
export async function formatReviewMetadata(path: string) {
  const document: unknown = JSON.parse(await readFile(path, 'utf8'));
  function format(value: unknown, depth = 0, location = ''): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    const indent = '  '.repeat(depth), childIndent = `${indent}  `;
    const compactChildren = location === 'metadata.samples' || location === 'metadata.layouts' || location === 'metadata.comparisons';
    const child = (entry: unknown, key: string) => compactChildren ? JSON.stringify(entry)
      : format(entry, depth + 1, location ? `${location}.${key}` : key);
    if (Array.isArray(value)) {
      return value.length ? `[\n${value.map((entry, index) => `${childIndent}${child(entry, String(index))}`).join(',\n')}\n${indent}]` : '[]';
    }
    const entries = Object.entries(value);
    return entries.length ? `{\n${entries.map(([key, entry]) => `${childIndent}${JSON.stringify(key)}: ${child(entry, key)}`).join(',\n')}\n${indent}}` : '{}';
  }
  const formatted = `${format(document)}\n`;
  // Formatting must preserve every capture field and numeric value.
  if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(document)) throw new Error('Metadata formatting changed content.');
  await writeFile(path, formatted);
}
