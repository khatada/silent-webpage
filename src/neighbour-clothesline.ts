import { Container, Graphics } from 'pixi.js';
import { clotheslinePlacement } from './clothesline-placement';
import type { ResidentialHouse, StreetGap } from './residential-layout';

/** Two muted garments carry the same night breeze as the nearby rooftop leaves. */
export function createNeighbourClothesline(houses: readonly ResidentialHouse[], width: number, alley?: StreetGap): {
  art: Container; update(seconds: number): void;
} | undefined {
  const place = clotheslinePlacement(houses, width, alley);
  if (!place) return undefined;
  const art = new Container();
  art.position.set(place.x, place.y);
  const rack = new Graphics()
    .rect(0, 0, 1, 15).rect(place.width - 1, 0, 1, 15).fill(0x626073)
    .rect(0, 1, place.width, 1).fill(0x716779);
  const tops = new Graphics()
    .rect(3, 3, 3, 3).rect(2, 4, 5, 2).fill(0x565065)
    .rect(7, 3, 3, 3).fill(0x655968)
    .rect(4, 1, 1, 3).rect(8, 1, 1, 3).fill(0x9c8b83);
  const shirt = new Graphics().rect(3, 6, 3, 5).fill(0x565065)
    .rect(3, 10, 3, 1).fill(0x494459);
  const towel = new Graphics().rect(7, 6, 3, 6).fill(0x655968)
    .rect(7, 11, 3, 1).fill(0x554b5c);
  art.addChild(rack, tops, shirt, towel);
  return {
    art,
    update(seconds) {
      const wind = Math.sin(seconds * 0.24);
      shirt.x = Math.round(wind);
      towel.x = Math.round(wind * 0.8);
    },
  };
}
