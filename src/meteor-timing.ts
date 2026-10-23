export const meteorTiming = { first: 6, interval: 90, duration: 2, fade: 0.45, peakAlpha: 0.6 } as const;

/** A rare event derives entirely from the shared, pausable scene clock. */
export function meteorState(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < meteorTiming.first) return { progress: 0, alpha: 0 };
  const phase = (seconds - meteorTiming.first) % meteorTiming.interval;
  if (phase >= meteorTiming.duration) return { progress: 0, alpha: 0 };
  const fade = Math.max(0, Math.min(1, phase / meteorTiming.fade,
    (meteorTiming.duration - phase) / meteorTiming.fade));
  return { progress: phase / meteorTiming.duration, alpha: meteorTiming.peakAlpha * (fade * fade * (3 - 2 * fade)) };
}
