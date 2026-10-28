import { eventRandom } from './event-random';

export const maximumStarDarkness = 0.45;
const eventSpacing = 5;
const eventJitter = 2;
const initialPhase = (index: number, composition: number) => eventRandom(index, composition, 0, 10) * eventSpacing;
const eventStart = (event: number, index: number, composition: number) =>
  -initialPhase(index, composition) + event * eventSpacing
    + (event === 0 ? 0 : eventRandom(index, composition, event, 11) * eventJitter);

/** An individual event, retaining period/phase for review callers; later events have new timing and depth. */
export function starCycle(index: number, composition: number, event = 0) {
  const start = eventStart(event, index, composition);
  const period = eventStart(event + 1, index, composition) - start;
  return { period, phase: -start,
    peak: period * (0.35 + eventRandom(index, composition, event, 12) * 0.3),
    maximum: 0.32 + eventRandom(index, composition, event, 13) * (maximumStarDarkness - 0.32) };
}

/** Smooth irregular twinkles retain over half of the core light; the surrounding glow stays untouched. */
export function starDarkness(seconds: number, index: number, composition: number): number {
  if (!Number.isFinite(seconds)) return 0;
  let event = Math.floor((seconds + initialPhase(index, composition)) / eventSpacing);
  if (seconds < eventStart(event, index, composition)) event--;
  const { period, phase, peak, maximum } = starCycle(index, composition, event);
  const time = seconds + phase;
  const amount = Math.max(0, Math.min(1, time < peak ? time / peak : (period - time) / (period - peak)));
  return maximum * amount * amount * (3 - 2 * amount);
}
