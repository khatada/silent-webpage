/** Uneven gentle holds; the shared scene clock also controls pause/resume. */
export function laundryFrame(seconds: number, composition: 0 | 1 = 0): number {
  const phase = (((seconds + composition * 5) % 14) + 14) % 14;
  if (phase < 3) return 0;
  if (phase < 5.5) return 1;
  if (phase < 8) return 2;
  if (phase < 10.5) return 3;
  if (phase < 12) return 2;
  return 0;
}
