import { Rectangle, Texture } from 'pixi.js';

/** Own only this logical view; the Assets cache retains the shared image source and native-frame texture. */
export function createLogicalBackground(cached: Texture, width: number, height: number, resolution: number) {
  cached.source.resolution = resolution;
  // The resolution setter does not emit resize: never reuse the cached texture's native frame.
  return new Texture({ source: cached.source, frame: new Rectangle(0, 0, width, height) });
}
