/** Equal phases on the shared offscreen loop, with at least one train-length gap.
 * Four extra pixels leave two pixels of clearance before position rounding.
 */
export function trainServiceOffsets(width: number, trainWidth: number): number[] {
  return width >= 3 * trainWidth + 4 ? [0, (width + trainWidth) / 2] : [0];
}
