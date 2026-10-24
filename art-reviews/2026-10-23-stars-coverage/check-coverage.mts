import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const project = process.argv[2] ?? process.cwd();
const { starScenes, starCoreSampled } = await import(pathToFileURL(join(project, 'src/image-stars.ts')).href);
const { generatedLayout } = await import(pathToFileURL(join(project, 'src/generated-layout.ts')).href);
const emptyGeometric: unknown[] = [], emptySampled: unknown[] = [];
let checked = 0;
for (let width = 100; width <= 2600; width += 25) for (let height = 100; height <= 1700; height += 25) {
  const layout = generatedLayout(width, height), composition = layout.portrait ? 2 : layout.wide ? 1 : 0;
  const visible = starScenes[composition].filter(({ core: [x, y, w, h] }: { core: readonly number[] }) => {
    const left = layout.originX + x * layout.scale, top = layout.originY + y * layout.scale;
    return left + w * layout.scale > 0 && left < width && top + h * layout.scale > 0
      && top < Math.min(height, layout.skyBottom);
  });
  const sampled = visible.filter(({ core: [x, y] }: { core: readonly number[] }) => starCoreSampled(x, y, layout.scale));
  const item = { width, height, composition, scale: layout.scale, originX: layout.originX,
    originY: layout.originY, skyBottom: layout.skyBottom, geometric: visible.length, sampled: sampled.length };
  if (!visible.length) emptyGeometric.push(item);
  if (!sampled.length) emptySampled.push(item);
  checked++;
}
console.log(JSON.stringify({ scope: 'Coordinate, layout-scale and starCoreSampled coverage only; darkness maximum and timing are not inspected.',
  selectedCoreCoordinates: starScenes.map((stars: { core: readonly number[] }[]) => stars.map(star => star.core)),
  checked, selectedCores: starScenes.map((stars: unknown[]) => stars.length),
  emptyGeometricCount: emptyGeometric.length, emptySampledCount: emptySampled.length,
  emptyGeometric, emptySampled }, null, 2));
