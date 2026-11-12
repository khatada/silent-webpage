import { eventRandom } from './event-random';

const eventSpacing = 8.5;
const eventJitter = 2;
const firstDelay = (index: number, composition: number) => 0.5 + eventRandom(index, composition, 0, 0) * 3;
const eventStart = (event: number, index: number, composition: number) =>
  firstDelay(index, composition) + event * eventSpacing
    + (event === 0 ? 0 : eventRandom(index, composition, event, 1) * eventJitter);

/** Absolute event start, variable off/on holds and a shared short fade; event 0 is the first change. */
export function skylineLightCycle(index: number, composition: number, event = 0) {
  const delay = eventStart(event, index, composition);
  const period = eventStart(event + 1, index, composition) - delay;
  return { delay, period,
    fade: 0.45 + eventRandom(index, composition, event, 3) * 0.4,
    maximum: 0.82 + eventRandom(index, composition, 0, 4) * 0.18,
    offDuration: period - (0.45 + eventRandom(index, composition, event, 3) * 0.4) };
}

/** Independent rooms alternate between lit and dark without resetting a shared block of time. */
export function skylineLightDarkness(seconds: number, index: number, composition: number): number {
  const first = firstDelay(index, composition);
  const initiallyDark = eventRandom(index, composition, 0, 5) >= 0.5;
  const maximum = skylineLightCycle(index, composition).maximum;
  if (!Number.isFinite(seconds) || seconds <= first) return initiallyDark ? maximum : 0;
  // Start jitter is smaller than a slot. Only the current and previous events can contain this time.
  let event = Math.floor((seconds - first) / eventSpacing);
  if (seconds < eventStart(event, index, composition)) event--;
  const { delay, fade } = skylineLightCycle(index, composition, event);
  const time = seconds - delay;
  const smooth = (value: number) => value * value * (3 - 2 * value);
  const beforeDark = event % 2 === 0 ? initiallyDark : !initiallyDark;
  const before = beforeDark ? maximum : 0;
  const after = beforeDark ? 0 : maximum;
  const amount = Math.max(0, Math.min(1, time / fade));
  return before + (after - before) * smooth(amount);
}
