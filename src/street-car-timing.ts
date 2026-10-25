export const streetCarPeriod = 28;
export const streetCarTravel = 20;
export const streetCarInitialOffset = 5;

/** Shared scene time; the remaining eight seconds contain no car. */
export function streetCarTiming(seconds: number) {
  const time = ((seconds + streetCarInitialOffset) % streetCarPeriod + streetCarPeriod) % streetCarPeriod;
  const progress = Math.min(time / streetCarTravel, 1);
  return { visible: time < streetCarTravel, progress,
    distance: 1 - (1 - progress) ** 2,
    alpha: progress <= 0.85 ? 1 : Math.max(0, (1 - progress) / 0.15) };
}
