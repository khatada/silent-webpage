import { eventRandom } from './event-random';

const eventSpacing = 18;
const eventJitter = 4;
const firstDelay = (index: number, composition: number) => 1 + eventRandom(index, composition, 0, 0) * 4;
const eventStart = (event: number, index: number, composition: number) =>
  firstDelay(index, composition) + event * eventSpacing
    + (event === 0 ? 0 : eventRandom(index, composition, event, 1) * eventJitter);

/** Absolute event start, variable off/on holds and a shared short fade; event 0 is the first change. */
export function skylineLightCycle(index: number, composition: number, event = 0) {
  const delay = eventStart(event, index, composition);
  const period = eventStart(event + 1, index, composition) - delay;
  return { delay, period, fade: 0.7,
    offDuration: period * (0.3 + eventRandom(index, composition, event, 2) * 0.25) };
}

/** Independent rooms start lit, then vary each event without resetting a shared block of time. */
export function skylineLightDarkness(seconds: number, index: number, composition: number): number {
  const first = firstDelay(index, composition);
  if (!Number.isFinite(seconds) || seconds <= first) return 0;
  // Start jitter is smaller than a slot. Only the current and previous events can contain this time.
  let event = Math.floor((seconds - first) / eventSpacing);
  if (seconds < eventStart(event, index, composition)) event--;
  const { delay, fade, offDuration } = skylineLightCycle(index, composition, event);
  const time = seconds - delay;
  const smooth = (value: number) => value * value * (3 - 2 * value);
  if (time < fade) return smooth(time / fade);
  if (time < offDuration) return 1;
  if (time < offDuration + fade) return 1 - smooth((time - offDuration) / fade);
  return 0;
}
