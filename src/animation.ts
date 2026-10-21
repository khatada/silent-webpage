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

export interface CatPose { x: number; direction: 1 | -1; frame: number; breath: 0 | 0.5 }

/** Eighteen-second walks alternate with long, unhurried grooming and resting pauses. */
export function catPose(seconds: number, width: number): CatPose {
  const time = ((seconds % 64) + 64) % 64;
  const outward = time < 32;
  const leg = outward ? time : time - 32;
  const walking = leg < 18;
  const progress = outward ? Math.min(leg / 18, 1) : 1 - Math.min(leg / 18, 1);
  let frame: number;
  if (walking) frame = Math.floor(leg * 4) % 4;
  else if (leg < 21) frame = 4;
  else if (leg < 25) frame = 5 + Math.floor(leg - 21) % 2;
  else if (leg < 30) frame = 7;
  else frame = 8;
  return {
    x: Math.round(width * (0.3 + 0.23 * progress)),
    direction: outward ? 1 : -1,
    frame,
    breath: frame === 7 && leg >= 26 && leg < 28.5 ? 0.5 : 0,
  };
}
