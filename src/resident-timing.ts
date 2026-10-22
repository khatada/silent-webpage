/** Long seated holds surround a small head/shoulder bend; the scene owns the clock. */
export function residentFrame(seconds: number, offset = 0): number {
  const phase = (((seconds + offset) % 20) + 20) % 20;
  if (phase < 9) return 0;
  if (phase < 10.5) return 1;
  if (phase < 13.5) return 2;
  if (phase < 15) return 1;
  return 0;
}
