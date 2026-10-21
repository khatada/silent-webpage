/** Generated stance toe measurements require unequal distance intervals, especially during support. */
export const walkingPhaseOffsets = [0, 33, 63, 88, 112, 140, 164, 184] as const;
export const walkingSourceStride = 192;

export function walkingStride(sceneScale: number): number {
  return walkingSourceStride * 0.25 * (Number.isFinite(sceneScale) && sceneScale > 0 ? sceneScale : 1);
}

/** Direction-adjusted distance advances the same eight poses on either walking leg. */
export function walkingFrame(x: number, direction: 1 | -1, sceneScale: number): number {
  const stride = walkingStride(sceneScale);
  const distance = Number.isFinite(x) ? x * direction : 0;
  const phase = ((distance % stride) + stride) % stride / stride * walkingSourceStride;
  for (let index = walkingPhaseOffsets.length - 1; index > 0; index--) {
    if (phase + 1e-9 >= walkingPhaseOffsets[index]) return index;
  }
  return 0;
}
