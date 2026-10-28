/** Stable event-local noise: sampling order, frame rate, pauses and resize cannot change it. */
export function eventRandom(index: number, composition: number, event: number, channel: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(composition + 1, 0x85ebca6b)
    ^ Math.imul(event, 0xc2b2ae35) ^ Math.imul(channel + 1, 0x27d4eb2f);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 0x100000000;
}
