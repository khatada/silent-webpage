import { describe, expect, it } from 'vitest';
import { correctPixelArt, type PixelImage } from './pixel-correction';

const image = (width: number, height: number, color: (x: number, y: number) => number[]): PixelImage => ({
  width, height, data: Uint8Array.from(Array.from({ length: width * height }, (_, index) => color(index % width, Math.floor(index / width))).flat()),
});
const red = [255, 0, 0, 255];
const blue = [0, 0, 255, 128];

describe('declared pixel grid correction', () => {
  it('removes a shifted margin and partial edges, preserving exact alpha and nearest-neighbor blocks', () => {
    const input = image(6, 4, (x, y) => x < 1 || y < 1 ? [0, 0, 0, 0] : x < 3 ? red : blue);
    const output = correctPixelArt(input, { cellSize: 2, offsetX: 1, offsetY: 1, outputScale: 2 });
    expect(output).toEqual(image(4, 2, x => x < 2 ? red : blue));
  });

  it('recovers alternating colors on a noninteger pitch using pixel-center membership', () => {
    const input = image(9, 9, (x, y) => (Math.floor((x + 0.5) / 2.25) + Math.floor((y + 0.5) / 2.25)) % 2 ? blue : red);
    expect(correctPixelArt(input, { cellSize: 2.25 })).toEqual(image(4, 4, (x, y) => (x + y) % 2 ? blue : red));
  });

  it('chooses the majority color and the closest-to-center color when counts tie', () => {
    const input = image(3, 3, (x, y) => x === 1 && y === 1 ? blue : red);
    expect(Array.from(correctPixelArt(input, { cellSize: 3 }).data)).toEqual(red);
    const tied = image(2, 2, (x, y) => x === 0 && y === 0 ? red : blue);
    expect(Array.from(correctPixelArt(tied, { cellSize: 2 }).data)).toEqual(blue);
    const distinct = image(3, 3, (x, y) => [x, y, x + y, 255]);
    expect(Array.from(correctPixelArt(distinct, { cellSize: 3 }).data)).toEqual([1, 1, 2, 255]);
  });

  it('is idempotent on an already aligned native grid, including transparent colors', () => {
    const input = image(3, 2, (x, y) => [x * 40, y * 90, 7, x === 0 ? 0 : 255]);
    expect(correctPixelArt(input, { cellSize: 1 })).toEqual(input);
    const expanded = correctPixelArt(input, { cellSize: 1, outputScale: 3 });
    expect(correctPixelArt(expanded, { cellSize: 3 })).toEqual(input);
  });

  it('rejects invalid geometry and allocations before processing', () => {
    const input = image(2, 2, () => red);
    for (const cellSize of [0, -1, NaN, Infinity, 3]) expect(() => correctPixelArt(input, { cellSize })).toThrow();
    for (const offsetX of [-1, 2, NaN]) expect(() => correctPixelArt(input, { cellSize: 2, offsetX })).toThrow();
    for (const outputScale of [0, 1.5, Infinity, 100_000]) expect(() => correctPixelArt(input, { cellSize: 1, outputScale })).toThrow();
    expect(() => correctPixelArt({ ...input, data: new Uint8Array(3) }, { cellSize: 1 })).toThrow();
    expect(() => correctPixelArt({ width: 100_000, height: 100_000, data: new Uint8Array() }, { cellSize: 1 })).toThrow();
  });
});
