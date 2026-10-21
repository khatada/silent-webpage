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

type GroomFrame = 0 | 1 | 2 | 3 | 4 | 5;
export interface CatPose {
  x: number; direction: 1 | -1; frame: number; breath: 0 | 0.5;
  groomFrame?: GroomFrame; settleFrame?: 0 | 1 | 2 | 3 | 4 | 5;
}

// Passing poses are short; licking, wiping and the final lowered paw hold longer.
const groomingSteps = [[21.25, 0], [21.5, 1], [22.25, 2], [22.5, 3], [23, 4],
  [23.5, 5], [23.75, 3], [24, 1], [25, 0]] as const;

/** Body-scaled walks alternate with long grooming and resting pauses in a 64-second cycle. */
export function catPose(seconds: number, width: number, sceneScale = 1): CatPose {
  const time = ((seconds % 64) + 64) % 64;
  const outward = time < 32;
  const leg = outward ? time : time - 32;
  const size = Number.isFinite(sceneScale) && sceneScale > 0 ? sceneScale : 1;
  const distance = width * 0.5;
  const walkDuration = Math.min(18, Math.max(2, distance / (32 * size)));
  const walking = leg < walkDuration;
  const progress = outward ? Math.min(leg / walkDuration, 1) : 1 - Math.min(leg / walkDuration, 1);
  let frame: number;
  if (walking) frame = Math.floor(leg * 4) % 4;
  else if (leg < 21) frame = 4;
  else if (leg < 25) frame = 5 + Math.floor(leg - 21) % 2;
  else if (leg < 30) frame = 7;
  else frame = 8;
  return {
    x: Math.round(width * (0.25 + 0.5 * progress)),
    direction: outward ? 1 : -1,
    frame,
    breath: frame === 7 && leg >= 26 && leg < 28.5 ? 0.5 : 0,
    ...(leg >= 21 && leg < 25 ? { groomFrame: groomingSteps.find(([end]) => leg < end)![1] } : {}),
    ...(leg >= 25 && leg < 26.5 ? { settleFrame: Math.floor((leg - 25) * 4) as 0 | 1 | 2 | 3 | 4 | 5 } : {}),
  };
}
