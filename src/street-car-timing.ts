export const streetCarPeriod = 20;
export const streetCarTravel = 14;
export const streetCarInitialOffset = 3.5;

/** Shared scene time; fourteen seconds of travel leave a six-second gap. */
export function streetCarTiming(seconds: number) {
  const time = ((seconds + streetCarInitialOffset) % streetCarPeriod + streetCarPeriod) % streetCarPeriod;
  const progress = Math.min(time / streetCarTravel, 1);
  return { visible: time < streetCarTravel, progress,
    distance: 1 - (1 - progress) ** 2,
    alpha: progress <= 0.85 ? 1 : Math.max(0, (1 - progress) / 0.15) };
}
