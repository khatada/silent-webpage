import { Graphics } from 'pixi.js';

/** A steady neighborhood light sits against a wall, leaving the taxi's narrow route clear. */
export function createAlleyVendingMachine({ alley, viewportWidth }: {
  alley: { left: number; width: number } | undefined;
  viewportWidth: number;
}): Graphics | undefined {
  if (!alley) return undefined;
  const chair = Math.round(viewportWidth * 0.68);
  const blocked = [[0, 47], [chair - 1, chair + 31], [viewportWidth - 30, viewportWidth - 14]];
  const candidates = [alley.left - 7, alley.left + alley.width + 1]
    .filter((x) => x >= 2 && x + 6 <= viewportWidth - 2
      && !blocked.some(([left, right]) => x < right && x + 6 > left));
  const railingOverlap = (x: number) => {
    let overlap = 0;
    for (let post = 12; post < viewportWidth; post += 57) {
      overlap += Math.max(0, Math.min(x + 6, post + 2) - Math.max(x, post));
    }
    return overlap;
  };
  // Prefer the left wall, unless a foreground railing post would hide more of that cabinet.
  candidates.sort((a, b) => railingOverlap(a) - railingOverlap(b));
  const x = candidates[0];
  if (x === undefined) return undefined;
  const y = 319;
  const art = new Graphics();
  // A diffuse pool on dry paving: no mirror image, shimmer, or wet-road reflection.
  art.rect(x - 2, y + 14, 10, 1).fill({ color: 0x7d96a0, alpha: 0.12 });
  art.rect(x - 1, y + 15, 8, 1).fill({ color: 0x7d96a0, alpha: 0.07 });
  art.rect(x + 1, y + 16, 4, 1).fill({ color: 0x7d96a0, alpha: 0.04 });
  art.rect(x, y, 6, 14).fill(0x454154);
  art.rect(x, y, 6, 1).fill(0x737382);
  art.rect(x + 5, y + 1, 1, 13).fill(0x252d40);
  art.rect(x + 1, y + 1, 4, 8).fill(0x728996);
  for (const row of [3, 6]) {
    art.rect(x + 1, y + row, 1, 2).fill(0xb9a28a);
    art.rect(x + 3, y + row, 1, 2).fill(0x9aaeb0);
  }
  art.rect(x + 4, y + 10, 1, 1).fill(0x7f9b8f);
  art.rect(x + 1, y + 11, 3, 1).fill(0x131d2d);
  art.rect(x + 1, y + 13, 1, 1).rect(x + 4, y + 13, 1, 1).fill(0x192134);
  return art;
}
