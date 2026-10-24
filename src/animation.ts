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
  turnFrame?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stretchFrame?: 0 | 1 | 2 | 3 | 4 | 5;
  lookFrame?: 0 | 1;
}

// Passing poses are short; licking, wiping and the final lowered paw hold longer.
const groomingSteps = [[21.25, 0], [21.5, 1], [22.25, 2], [22.5, 3], [23, 4],
  [23.5, 5], [23.75, 3], [24, 1], [25, 0]] as const;

export const catLegDuration = 36;
export const catPeriod = catLegDuration * 2;
export const catTurnStart = 32;
const turningSteps = [[32.25, 0], [32.75, 1], [33.25, 2], [33.75, 3],
  [34.25, 4], [34.75, 5], [35.75, 6], [36, 7]] as const;

/** Body-scaled walks, resting and a gradual turn repeat in a 72-second cycle. */
export function catPose(seconds: number, width: number, sceneScale = 1): CatPose {
  const time = ((seconds % catPeriod) + catPeriod) % catPeriod;
  const outward = time < catLegDuration;
  const leg = outward ? time : time - catLegDuration;
  const size = Number.isFinite(sceneScale) && sceneScale > 0 ? sceneScale : 1;
  const distance = width * 0.5;
  const walkDuration = Math.min(18, Math.max(2, distance / (32 * size)));
  const walking = leg < walkDuration;
  const available = 21 - walkDuration;
  const lookDuration = Math.min(6, available - 1.5);
  const lookStart = walkDuration + (available - lookDuration) / 2;
  const looking = lookDuration >= 3 && leg >= lookStart && leg < lookStart + lookDuration;
  const lookProgress = (leg - lookStart) / lookDuration;
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
    ...(looking ? { lookFrame: lookProgress < 0.25 || lookProgress >= 0.75 ? 0 as const : 1 as const } : {}),
    ...(leg >= catTurnStart ? { turnFrame: turningSteps.find(([end]) => leg < end)![1] } : {}),
    breath: frame === 7 && leg >= 26 && leg < 28.5 ? 0.5 : 0,
    ...(leg >= 21 && leg < 25 ? { groomFrame: groomingSteps.find(([end]) => leg < end)![1] } : {}),
    ...(leg >= 30 && leg < 31.5 ? { stretchFrame: Math.floor((leg - 30) * 4) as 0 | 1 | 2 | 3 | 4 | 5 } : {}),
    ...(leg >= 25 && leg < 26.5 ? { settleFrame: Math.floor((leg - 25) * 4) as 0 | 1 | 2 | 3 | 4 | 5 } : {}),
  };
}
