import { eventRandom } from './event-random';

const eventSpacing = 8;
const eventJitter = 2;
const firstChange = (index: number, composition: number) =>
  0.4 + eventRandom(index, composition, 0, 20) * 2.4;
const eventStart = (event: number, index: number, composition: number) =>
  firstChange(index, composition) + event * eventSpacing
    + (event === 0 ? 0 : eventRandom(index, composition, event, 21) * eventJitter);

/** Each nearby home alternates independently, with a different interval and fade on every change. */
export function residentialLightCycle(index: number, composition: number, event = 0) {
  const start = eventStart(event, index, composition);
  return {
    start,
    period: eventStart(event + 1, index, composition) - start,
    fade: 0.65 + eventRandom(index, composition, event, 22) * 0.5,
  };
}

/** Stable timestamp-based light level: pauses, frame rate and resize never redraw the schedule. */
export function residentialLightBrightness(seconds: number, index: number, composition: number): number {
  const initial = eventRandom(index, composition, 0, 23) >= 0.45 ? 1 : 0;
  const first = firstChange(index, composition);
  if (!Number.isFinite(seconds) || seconds <= first) return initial;
  let event = Math.floor((seconds - first) / eventSpacing);
  if (seconds < eventStart(event, index, composition)) event--;
  const { start, fade } = residentialLightCycle(index, composition, event);
  const before = event % 2 === 0 ? initial : 1 - initial;
  const after = 1 - before;
  const amount = Math.max(0, Math.min(1, (seconds - start) / fade));
  const smooth = amount * amount * (3 - 2 * amount);
  return before + (after - before) * smooth;
}
