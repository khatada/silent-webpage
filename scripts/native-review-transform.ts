/** Preserve production's integer background origin and its fractional crop sampling phase. */
export function nativeReviewTransform(panelX: number, panelY: number,
  context: readonly [number, number, number, number], scale: number) {
  const originX = Math.round(panelX - context[0] * scale);
  const originY = Math.round(panelY - context[1] * scale);
  if (!Number.isInteger(originX) || !Number.isInteger(originY)) throw new Error('Background origin must be integral.');
  return { originX, originY, contextX: originX + context[0] * scale, contextY: originY + context[1] * scale };
}
