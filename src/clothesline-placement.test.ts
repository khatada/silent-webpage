import { describe, expect, it } from 'vitest';
import { clotheslinePlacement } from './clothesline-placement';
import type { ResidentialHouse, StreetGap } from './residential-layout';

const house = (x: number, width: number, antenna = false): ResidentialHouse => ({
  x, width, antenna, top: 280, body: 0, rooms: [],
});

describe('one neighboring rooftop clothesline', () => {
  it('stays on its trimmed roof, clear of HVAC, antennas, the doorway and viewport edges', () => {
    for (const viewport of [140, 185, 640]) {
      const houses = [house(44, 64, true), house(112, 60)];
      const alley: StreetGap = { after: 0, left: 102, width: 16, leftTrim: 6, rightTrim: 6 };
      const before = structuredClone(houses);
      const place = clotheslinePlacement(houses, viewport, alley);
      expect(place).toBeDefined();
      if (!place) continue;
      const selected = houses[place.houseIndex];
      const left = selected.x + (place.houseIndex === 1 ? alley.rightTrim : 0);
      const roofWidth = selected.width - (place.houseIndex === 0 ? alley.leftTrim : alley.rightTrim);
      expect(place.width).toBeGreaterThanOrEqual(12);
      expect(place.width).toBeLessThanOrEqual(18);
      expect(place.x).toBeGreaterThanOrEqual(49);
      expect(place.x).toBeGreaterThanOrEqual(left + 22);
      expect(place.x + place.width).toBeLessThanOrEqual(left + roofWidth - (selected.antenna ? 24 : 4));
      expect(place.x + place.width).toBeLessThanOrEqual(viewport - 2);
      expect(houses).toEqual(before);
    }
  });

  it('does not put a rack on a roof made too narrow by the street opening', () => {
    const houses = [house(50, 46), house(100, 60)];
    const alley: StreetGap = { after: 0, left: 84, width: 16, leftTrim: 12, rightTrim: 0 };
    expect(clotheslinePlacement(houses, 185, alley)?.houseIndex).toBe(1);
  });

  it('omits the rack when no equipment-free visible roof can accommodate it', () => {
    expect(clotheslinePlacement([], 185)).toBeUndefined();
    expect(clotheslinePlacement([house(-12, 40), house(60, 39), house(105, 40, true)], 185)).toBeUndefined();
  });
});
