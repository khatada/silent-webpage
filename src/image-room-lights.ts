import { Container, Rectangle, Texture } from 'pixi.js';
import { createWindowCover } from './image-window-cover';

type Rect = readonly [number, number, number, number];

/** Glass interiors only: frames, balcony rails and plants stay in the generated backdrop. */
export const roomLightAreas = [
  { windowIndex: 1, glass: [389, 292, 8, 8], dark: [400, 292, 8, 8], replace: false },
  { windowIndex: 6, glass: [483, 175, 5, 11], dark: [263, 169, 4, 6], replace: true },
  { windowIndex: 0, glass: [531, 936, 12, 14], dark: [548, 936, 12, 14], replace: false },
] as const;

/** Keep the original room index/alpha and actor anchor while extending its covered glass. */
export function createImageRoomLights(backgrounds: readonly Texture[]) {
  const interiors = roomLightAreas.map((area, index) => new Texture({
    source: backgrounds[index].source, frame: new Rectangle(...area.dark),
  }));
  return {
    createCover(composition: 0 | 1 | 2, index: number, window: Rect, wall: Texture,
      scale: number, originX: number, originY: number) {
      const group = new Container();
      const area = roomLightAreas[composition];
      const selected = index === area.windowIndex;
      if (!selected || !area.replace) group.addChild(createWindowCover(wall, window, scale, originX, originY));
      if (selected) group.addChild(createWindowCover(interiors[composition], area.glass, scale, originX, originY));
      return group;
    },
    destroy() { interiors.forEach(texture => texture.destroy(false)); },
  };
}
