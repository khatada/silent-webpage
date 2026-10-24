import { describe, expect, it } from 'vitest';
import { starCoreSampled, starScenes } from './image-stars';
import { generatedLayout } from './generated-layout';

describe('star core sampling', () => {
  it('does not darken neighbours of cores discarded by reciprocal-integer nearest reduction', () => {
    expect(starCoreSampled(635, 8, 0.5)).toBe(false);
    expect(starCoreSampled(635, 9, 0.5)).toBe(true);
    expect(starCoreSampled(634, 9, 0.5)).toBe(false);
    expect(starCoreSampled(4, 7, 1 / 3)).toBe(true);
    expect(starCoreSampled(3, 7, 1 / 3)).toBe(false);
    expect(starCoreSampled(6, 10, 0.25)).toBe(true);
    expect(starCoreSampled(5, 10, 0.25)).toBe(false);
    expect(starCoreSampled(635, 8, 1)).toBe(true);
    expect(starCoreSampled(635, 8, 4)).toBe(true);
  });
  it('retains actual sampled cores in representative and formerly empty crop boundaries', () => {
    const views = [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080], [800, 600],
      [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667], [375, 375], [600, 750],
      [100, 925], [100, 525], [100, 100]];
    for (const [width, height] of views) {
      const layout = generatedLayout(width, height);
      const composition = layout.portrait ? 2 : layout.wide ? 1 : 0;
      const visible = starScenes[composition].filter(({ core: [x, y] }) => {
        const px = layout.originX + x * layout.scale, py = layout.originY + y * layout.scale;
        return starCoreSampled(x, y, layout.scale) && px >= 0 && px < width && py >= 0 && py < layout.skyBottom;
      });
      expect(visible.length, `${width}x${height}`).toBeGreaterThan(0);
    }
  });
});
