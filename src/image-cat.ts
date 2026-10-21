import { Rectangle, Sprite, Texture } from 'pixi.js';
import type { CatPose } from './animation';
import { generatedArt } from './generated-art';
import { walkingFrame } from './walking-timing';

type Frame = readonly [number, number, number, number];

/** Shared production/preview compositor. Every visible pixel comes from reviewed generated images. */
export function createImageCat(atlas: Texture, restAtlas: Texture, walkAtlas: Texture, back: Texture, lift: Texture) {
  const textures: Texture[] = [];
  const frame = (source: Texture, rectangle: Frame, foot: number, normalization = 1) => {
    const texture = new Texture({ source: source.source, frame: new Rectangle(...rectangle) });
    textures.push(texture);
    return { texture, footAnchor: foot / rectangle[3], horizontalAnchor: 0.5, normalization };
  };
  const walkSources = { atlas: walkAtlas, back, lift };
  const walking = generatedArt.catWalk.map(spec => {
    const normalization = 100 / (spec.foot - spec.head);
    const selected = frame(walkSources[spec.source], spec.rect, spec.foot, normalization);
    // Align the head 90 normalized source pixels ahead of the moving body origin.
    selected.horizontalAnchor = (spec.nose - 90 / normalization) / spec.rect[2];
    return selected;
  });
  const sitting = frame(atlas, generatedArt.frames.sitting, 138);
  const rest = generatedArt.catRest;
  const groomOne = frame(restAtlas, rest.groomOne, 175, rest.normalization);
  const groomTwo = frame(restAtlas, rest.groomTwo, 172, rest.normalization);
  const curled = frame(restAtlas, rest.curled, 95, rest.normalization);
  const stretch = frame(restAtlas, rest.stretch, 164, rest.normalization);
  const poses = [sitting, sitting, sitting, sitting, sitting, groomOne, groomTwo, curled, stretch];
  return {
    createSprite() {
      const art = new Sprite(walking[0].texture);
      art.roundPixels = true;
      return art;
    },
    update(art: Sprite, pose: CatPose, sceneScale: number, footY: number) {
      const selected = pose.frame < 4 ? walking[walkingFrame(pose.x, pose.direction, sceneScale)]
        : poses[pose.frame] ?? sitting;
      art.texture = selected.texture;
      art.anchor.set(selected.horizontalAnchor, selected.footAnchor);
      const size = sceneScale * 0.25 * selected.normalization;
      art.scale.set(pose.direction * size, size);
      art.position.set(pose.x, footY);
      // No breathing deformation: the reviewed curled frame is held still.
    },
    destroy() { for (const texture of textures) texture.destroy(false); },
  };
}
