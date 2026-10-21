export interface WindowPosition { x: number; y: number }

/** Separate salts avoid coupling which rooms are occupied to when residents appear. */
function coordinateHash({ x, y }: WindowPosition, salt: number): number {
  let hash = Math.imul(x ^ salt, 73856093) ^ Math.imul(y, 19349663);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** Use coordinates rather than consuming the city generator's random sequence. */
export function windowPhase(position: WindowPosition): number {
  return coordinateHash(position, 0x63d83595) % 3000 / 100;
}

export function occupiedWindows<T extends WindowPosition>(windows: readonly T[]): T[] {
  const score = (position: WindowPosition) => coordinateHash(position, 0x4f1bbcdc);
  return [...windows]
    .sort((a, b) => score(a) - score(b) || a.x - b.x || a.y - b.y)
    .slice(0, Math.floor(windows.length / 7));
}

/** A brief, unhurried household movement is separated by long periods out of view. */
export function residentPose(seconds: number, phase: number): { x: number; alpha: number } {
  const time = ((seconds + phase) % 30 + 30) % 30;
  const x = time < 12 ? 1 + Math.max(0, time - 6) / 2
    : time < 14 ? 4 : Math.max(1, 4 - (time - 14) / 2);
  return {
    x: Math.round(x),
    alpha: Math.max(0, Math.min(1, (time - 6) / 0.8, (20 - time) / 0.8)),
  };
}
