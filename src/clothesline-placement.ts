import type { ResidentialHouse, StreetGap } from './residential-layout';

/** Fit one small rack beside existing roof equipment without rearranging the neighborhood. */
export function clotheslinePlacement(houses: readonly ResidentialHouse[], viewportWidth: number, alley?: StreetGap): {
  x: number; y: number; width: number; houseIndex: number;
} | undefined {
  let best: ReturnType<typeof clotheslinePlacement>;
  let score = Infinity;
  houses.forEach((house, houseIndex) => {
    const trimStart = alley?.after === houseIndex - 1 ? alley.rightTrim : 0;
    const trimEnd = alley?.after === houseIndex ? alley.leftTrim : 0;
    const left = house.x + trimStart;
    const width = house.width - trimStart - trimEnd;
    if (width < 40) return;
    // HVAC occupies roof-relative x=7..19; antennas start at width-21.
    const start = Math.max(left + 22, 49);
    const end = Math.min(left + width - (house.antenna ? 24 : 4), viewportWidth - 2);
    const rackWidth = Math.min(18, end - start);
    if (rackWidth < 12) return;
    const x = Math.round(Math.max(start, Math.min(end - rackWidth, viewportWidth * 0.58 - rackWidth / 2)));
    const candidateScore = Math.abs(x + rackWidth / 2 - viewportWidth * 0.58)
      + (house.antenna ? viewportWidth * 0.15 : 0);
    if (candidateScore < score) {
      score = candidateScore;
      best = { x, y: house.top - 18, width: rackWidth, houseIndex };
    }
  });
  return best;
}
