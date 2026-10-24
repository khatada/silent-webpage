export const plantPeriod = 18;

/** Long neutral holds separate two small leaf movements; scene owns the clock. */
export function plantFrame(seconds: number): 0 | 1 | 2 {
  const time = ((seconds % plantPeriod) + plantPeriod) % plantPeriod;
  return time >= 4.5 && time < 6.75 ? 1 : time >= 11.25 && time < 13.5 ? 2 : 0;
}
