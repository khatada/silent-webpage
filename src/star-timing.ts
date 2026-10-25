export const maximumStarDarkness = 0.45;

/** Different fixed periods and phases keep stars from pulsing together. */
export function starCycle(index: number, composition: number) {
  const period = 3 + ((index * 7 + composition * 5) % 15) * 4 / 14;
  return { period, phase: ((index * 11 + composition * 3) % 17) / 17 * period };
}

/** Smooth changes retain more than half of the original core light and preserve its surrounding glow. */
export function starDarkness(seconds: number, index: number, composition: number): number {
  const { period, phase } = starCycle(index, composition);
  return maximumStarDarkness / 2 * (1 - Math.cos((seconds + phase) / period * Math.PI * 2));
}
