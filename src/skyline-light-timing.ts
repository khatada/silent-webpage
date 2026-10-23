const firstChanges = [3, 7, 11, 5, 9, 12] as const;

/** Initial changes and later periods use separate fixed sequences, never mutable randomness. */
export function skylineLightCycle(index: number, composition: number) {
  return { delay: firstChanges[(index + composition * 2) % firstChanges.length],
    period: 43 + ((index * 17 + composition * 23 + 19) % 56), fade: 1.2 };
}

/** All rooms start lit; long holds surround one gradual off/on pair per room. */
export function skylineLightDarkness(seconds: number, index: number, composition: number): number {
  const { delay, period, fade } = skylineLightCycle(index, composition);
  if (seconds <= delay) return 0;
  const time = (seconds - delay) % period;
  const offUntil = period * 0.38;
  const smooth = (value: number) => value * value * (3 - 2 * value);
  if (time < fade) return smooth(time / fade);
  if (time < offUntil) return 1;
  if (time < offUntil + fade) return 1 - smooth((time - offUntil) / fade);
  return 0;
}
