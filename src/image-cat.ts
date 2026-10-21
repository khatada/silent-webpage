import { Rectangle, Sprite, Texture } from 'pixi.js';
import type { CatPose } from './animation';
import { generatedArt } from './generated-art';

type Frame = readonly [number, number, number, number];

/** Shared production/preview compositor. Every visible pixel comes from reviewed generated images. */
export function createImageCat(atlas: Texture, restAtlas: Texture) {
  const textures: Texture[] = [];
  const frame = (source: Texture, rectangle: Frame, foot: number, normalization = 1) => {
    const texture = new Texture({ source: source.source, frame: new Rectangle(...rectangle) });
    textures.push(texture);
    return { texture, footAnchor: foot / rectangle[3], normalization };
  };
  const walkOne = frame(atlas, generatedArt.frames.walkOne, 136);
  const walkTwo = frame(atlas, generatedArt.frames.walkTwo, 129);
  const sitting = frame(atlas, generatedArt.frames.sitting, 138);
  const rest = generatedArt.catRest;
  const groomOne = frame(restAtlas, rest.groomOne, 175, rest.normalization);
  const groomTwo = frame(restAtlas, rest.groomTwo, 172, rest.normalization);
  const curled = frame(restAtlas, rest.curled, 95, rest.normalization);
  const stretch = frame(restAtlas, rest.stretch, 164, rest.normalization);
  const poses = [walkOne, walkTwo, walkOne, walkTwo, sitting, groomOne, groomTwo, curled, stretch];
  return {
    createSprite() {
      const art = new Sprite(walkOne.texture);
      art.roundPixels = true;
      return art;
    },
    update(art: Sprite, pose: CatPose, sceneScale: number, footY: number) {
      const selected = poses[pose.frame] ?? sitting;
      art.texture = selected.texture;
      art.anchor.set(0.5, selected.footAnchor);
      const size = sceneScale * 0.25 * selected.normalization;
      art.scale.set(pose.direction * size, size);
      art.position.set(pose.x, footY);
      // No breathing deformation: the reviewed curled frame is held still.
    },
    destroy() { for (const texture of textures) texture.destroy(false); },
  };
}
