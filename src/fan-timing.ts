/** Four generated 30-degree steps repeat through the three-bladed rotor's symmetry. */
export function fanFrame(seconds: number): number {
  const step = Math.floor(seconds / 0.4 + 1e-9);
  return ((step % 4) + 4) % 4;
}
