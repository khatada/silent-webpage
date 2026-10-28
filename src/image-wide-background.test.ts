import { describe, expect, it } from 'vitest';
import { mirroredBackgroundTiles } from './image-wide-background';

describe('generated wide image edge reflection', () => {
  it('covers sky, floor and corner gaps with the original uniform pixel scale', () => {
    for (const [width, height, scale, x, y] of [[800, 600, 2, -323, 59], [2560, 1080, 4, -166, 58],
      [2000, 500, 2, 277, 9], [1000, 20, 1 / 9, 460, -4]]) {
      const tiles = mirroredBackgroundTiles(width, height, 723, 241, scale, x, y);
      for (let py = 0.5; py < height; py += 7) for (let px = 0.5; px < width; px += 7) {
        const hits = tiles.filter(tile => {
          const x2 = tile.x + tile.sourceWidth * tile.scaleX, y2 = tile.y + 241 * tile.scaleY;
          return px >= Math.min(tile.x, x2) && px < Math.max(tile.x, x2)
            && py >= Math.min(tile.y, y2) && py < Math.max(tile.y, y2);
        });
        expect(hits).toHaveLength(1);
      }
      for (const tile of tiles) {
        expect(Math.abs(tile.scaleX)).toBe(scale);
        expect(Math.abs(tile.scaleY)).toBe(scale);
        // The moon is at source x619: no side repetition may contain it.
        if (tile.sourceWidth < 723) expect(tile.sourceX <= 619 && tile.sourceX + tile.sourceWidth > 619).toBe(false);
      }
    }
  });
  it('uses no horizontal repetitions when the original covers the viewport', () => {
    expect(mirroredBackgroundTiles(1920, 1080, 723, 241, 4, -486, 58)
      .every(tile => tile.sourceWidth === 723)).toBe(true);
  });
});
