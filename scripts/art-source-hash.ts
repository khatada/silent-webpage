import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, posix, relative, resolve } from 'node:path';

/** Include every local module reachable from the scene, including type/geometry helpers. */
export async function artSourceHash(): Promise<string> {
  const sources = new Map<string, string>();
  async function visit(path: string): Promise<void> {
    const full = resolve(path);
    if (sources.has(full)) return;
    const source = await readFile(full, 'utf8');
    sources.set(full, source);
    for (const match of source.matchAll(/from\s+['"]([.][^'"]+)['"]/g)) {
      await visit(resolve(dirname(full), `${match[1]}.ts`));
    }
  }
  await visit('src/scene.ts');
  const hash = createHash('sha256');
  for (const [path, source] of [...sources].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(posix.normalize(relative(process.cwd(), path))).update('\0').update(source).update('\0');
  }
  return hash.digest('hex');
}
