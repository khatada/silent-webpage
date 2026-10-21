import { describe, expect, it } from 'vitest';
import { residentialHouses, streetGap } from './residential-layout';

function randomSource() {
  let seed = 74021;
  let calls = 0;
  return {
    random: () => { calls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; },
    count: () => calls,
  };
}

describe('one neighborhood street view', () => {
  it('preserves the original residential positions and random stream when collecting first', () => {
    const source = randomSource();
    const houses = residentialHouses(185, source.random);
    // Captured from the original immediate-drawing loop before extracting its model.
    expect(houses.map((house) => [house.x, house.width, house.top, house.rooms.length,
      house.rooms.filter((room) => room.light).length])).toEqual([
      [-12, 62, 281, 12, 9], [54, 31, 285, 6, 4], [89, 47, 274, 9, 6], [140, 60, 274, 12, 11],
    ]);
    expect(source.count()).toBe(115);
    expect(source.random()).toBe(0.8086682616267353);
  });

  it('opens a visible sixteen-pixel street without moving houses or hiding it behind rooftop objects', () => {
    for (const width of [140, 185, 640, 1280]) {
      const houses = residentialHouses(width, randomSource().random);
      const before = structuredClone(houses);
      const gap = streetGap(houses, width);
      expect(gap).toBeDefined();
      if (!gap) continue;
      expect(gap.width).toBe(16);
      expect(gap.leftTrim + gap.rightTrim).toBe(12);
      expect(houses[gap.after].width - gap.leftTrim).toBeGreaterThanOrEqual(19);
      expect(houses[gap.after + 1].width - gap.rightTrim).toBeGreaterThanOrEqual(19);
      const chair = Math.round(width * 0.68);
      for (let x = gap.left; x < gap.left + gap.width; x++) {
        expect(x).toBeGreaterThanOrEqual(47);
        expect(x >= chair - 1 && x < chair + 31).toBe(false);
        expect(x >= width - 30 && x < width - 14).toBe(false);
      }
      expect(houses).toEqual(before);
    }
  });

  it('does not force a street into a viewport with no usable opening', () => {
    expect(streetGap([], 140)).toBeUndefined();
    expect(streetGap(residentialHouses(80, randomSource().random), 80)).toBeUndefined();
  });
});
