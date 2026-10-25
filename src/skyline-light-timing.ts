const firstChanges = [1, 2.5, 4, 1.75, 3.25, 5] as const;

/** Initial changes and later periods use separate fixed sequences, never mutable randomness. */
export function skylineLightCycle(index: number, composition: number) {
  return { delay: firstChanges[(index + composition * 2) % firstChanges.length],
    period: 14 + ((index * 7 + composition * 11 + 3) % 16), fade: 0.7 };
}

/** Rooms start lit and change within seconds; steady holds separate gradual off/on fades. */
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
