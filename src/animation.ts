/** One continuous trip; re-entry happens beyond the viewport so there is no visible teleport. */
export function travelPosition(seconds: number, width: number, length: number, speed: number, initialX: number): number {
  const span = width + length;
  return Math.floor(((seconds * speed + initialX + length) % span + span) % span - length);
}

/** Each room holds its state for seconds; only transitions use a short smooth fade. */
export function windowBrightness(seconds: number, phase: number, period: number): number {
  const time = ((seconds + phase) % period + period) % period;
  const edge = period * 0.57;
  const smooth = (value: number) => {
    const amount = Math.max(0, Math.min(1, value));
    return amount * amount * (3 - 2 * amount);
  };
  return time < edge ? smooth(time / 0.9) : 1 - smooth((time - edge) / 0.9);
}

/** A rooftop patrol has two walking legs and pauses at each end. */
export function catPose(seconds: number, width: number): { x: number; direction: 1 | -1; frame: number } {
  const time = ((seconds % 50) + 50) % 50;
  const outward = time < 25;
  const walking = outward ? time < 18 : time < 43;
  const progress = outward ? Math.min(time / 18, 1) : 1 - Math.min((time - 25) / 18, 1);
  return {
    x: Math.round(width * (0.3 + 0.23 * progress)),
    direction: outward ? 1 : -1,
    frame: walking ? Math.floor(seconds * 4) % 4 : 4,
  };
}
