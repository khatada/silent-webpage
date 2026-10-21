/** A taxi passes once, then remains behind the houses for most of the 45-second cycle. */
export function taxiPose(seconds: number, alleyLeft: number, alleyWidth: number): { x: number; visible: boolean } {
  const time = ((seconds + 4) % 45 + 45) % 45;
  return {
    x: Math.floor(alleyLeft - 10 + Math.min(time / 8, 1) * (alleyWidth + 10)),
    visible: time < 8,
  };
}
