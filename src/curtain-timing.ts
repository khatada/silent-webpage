/** Generated frame 2 is the halfway bend; frame 1 is the furthest bend. Uneven holds keep the small hem movement quiet; the scene owns the clock. */
export function curtainFrame(seconds: number): number {
  const phase = ((seconds % 12) + 12) % 12;
  if (phase < 3.5) return 0;
  if (phase < 5.5) return 2;
  if (phase < 7.5) return 1;
  if (phase < 9.5) return 2;
  return 0;
}
