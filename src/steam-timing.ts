/** Six generated growth/dissipation phases share the scene clock. */
export function steamState(seconds: number) {
  const phase = ((seconds % 4.5) + 4.5) % 4.5;
  const fade = Math.min(1, phase / 0.375, (4.5 - phase) / 0.375);
  return { frame: Math.min(5, Math.floor(phase / 0.75)), alpha: 0.4 * fade };
}
