import { Rectangle, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';
import type { CatPose } from './animation';
import { generatedArt } from './generated-art';
import { walkingFrame } from './walking-timing';

type Frame = readonly [number, number, number, number];

/** Shared production/preview compositor. Every visible pixel comes from reviewed generated images. */
export function createImageCat(atlas: Texture, restAtlas: Texture, walkAtlas: Texture, back: Texture, lift: Texture,
  groomAtlas?: Texture, settleAtlas?: Texture, stretchAtlas?: Texture, stretchMid?: Texture, turnAtlas?: Texture,
  look?: { atlas: Texture; renderer: Renderer }, rise?: { atlas: Texture; renderer: Renderer }) {
  const textures: Texture[] = [];
  const ownedSeatedTextures: RenderTexture[] = [];
  const ownedRisingTextures: RenderTexture[] = [];
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
  let sitting = frame(atlas, generatedArt.frames.sitting, 138);
  const looking = look ? [sitting, frame(look.atlas, [0, 0, 108, 139], 138),
    frame(look.atlas, [108, 0, 108, 139], 138)].map(selected => {
    // Equal full-frame UVs prevent identical body pixels sampling differently
    // when switching between the original atlas and the generated head poses.
    const texture = RenderTexture.create({ width: 108, height: 139, resolution: 1 });
    texture.source.scaleMode = 'nearest';
    const source = new Sprite(selected.texture);
    source.roundPixels = true;
    look.renderer.render({ container: source, target: texture, clear: true });
    source.destroy();
    ownedSeatedTextures.push(texture);
    return { ...selected, texture };
  }) : [];
  sitting = looking[0] ?? sitting;
  const riseSpec = generatedArt.catRise;
  const rising = rise ? Array.from({ length: 6 }, (_, index) => {
    const selected = frame(rise.atlas,
      [(index + 1) * riseSpec.width, 0, riseSpec.width, riseSpec.height], riseSpec.foot, riseSpec.normalization);
    selected.horizontalAnchor = riseSpec.anchorX / riseSpec.width;
    // Equal native-sized UVs keep the generated intermediates stable when nearest-scaled.
    // The original seated/look textures stay untouched; atlas cell 0 is a material QA endpoint only.
    const texture = RenderTexture.create({ width: riseSpec.width, height: riseSpec.height, resolution: 1 });
    texture.source.scaleMode = 'nearest';
    const source = new Sprite(selected.texture);
    source.roundPixels = true;
    rise.renderer.render({ container: source, target: texture, clear: true });
    source.destroy();
    ownedRisingTextures.push(texture);
    return { ...selected, texture };
  }) : [];
  const rest = generatedArt.catRest;
  const groomOne = frame(restAtlas, rest.groomOne, 175, rest.normalization);
  const groomTwo = frame(restAtlas, rest.groomTwo, 172, rest.normalization);
  const curled = frame(restAtlas, rest.curled, 95, rest.normalization);
  const stretch = frame(restAtlas, rest.stretch, 164, rest.normalization);
  const poses = [sitting, sitting, sitting, sitting, sitting, groomOne, groomTwo, curled, stretch];
  const groom = generatedArt.catGroom;
  const grooming = groomAtlas ? groom.frames.map(spec => {
    const selected = frame(groomAtlas, spec.rect, spec.foot, groom.normalization);
    // Match the old seated body's origin, then align the stationary hips across the six poses.
    selected.horizontalAnchor = (spec.hip - groom.bodyOffset / groom.normalization) / spec.rect[2];
    return selected;
  }) : [];
  const settle = generatedArt.catSettle;
  const settling = settleAtlas ? [grooming[0] ?? groomOne,
    ...settle.frames.map(spec => {
      const selected = frame(settleAtlas, spec.rect, spec.foot, settle.normalization);
      // Align the support footprint while the hips and head lower through the generated poses.
      selected.horizontalAnchor = spec.anchorX / spec.rect[2];
      return selected;
    }), curled] : [];
  const stretchSources = { atlas: stretchAtlas, mid: stretchMid };
  const stretching = stretchAtlas && stretchMid ? [curled,
    ...generatedArt.catStretch.frames.map(spec => {
      const selected = frame(stretchSources[spec.source]!, spec.rect, spec.foot, spec.normalization);
      selected.horizontalAnchor = spec.anchorX / spec.rect[2];
      return selected;
    }), stretch] : [];
  const turning = turnAtlas ? [stretch, ...generatedArt.catTurn.frames.map(spec => {
    const selected = frame(turnAtlas, spec.rect, spec.foot, generatedArt.catTurn.normalization);
    selected.horizontalAnchor = spec.anchorX / spec.rect[2];
    return selected;
  })] : [];
  return {
    createSprite() {
      const art = new Sprite(walking[0].texture);
      art.roundPixels = true;
      return art;
    },
    update(art: Sprite, pose: CatPose, sceneScale: number, footY: number) {
      const groomPose = pose.frame === 5 || pose.frame === 6;
      const turnDirection = pose.turnFrame === 7 ? -pose.direction as 1 | -1 : pose.direction;
      const turnPose = pose.turnFrame === 7 ? walking[walkingFrame(pose.x, turnDirection, sceneScale)]
        : pose.turnFrame !== undefined ? turning[pose.turnFrame] : undefined;
      const selected = turnPose ?? (pose.frame < 4 ? walking[walkingFrame(pose.x, pose.direction, sceneScale)]
        : (pose.frame === 4 && pose.riseFrame !== undefined ? rising[pose.riseFrame - 1] : undefined)
          ?? (pose.frame === 4 && pose.lookFrame !== undefined ? looking[pose.lookFrame + 1] : undefined)
          ?? (groomPose && pose.groomFrame !== undefined ? grooming[pose.groomFrame] : undefined)
          ?? (pose.frame === 7 && pose.settleFrame !== undefined ? settling[pose.settleFrame] : undefined)
          ?? (pose.frame === 8 && pose.stretchFrame !== undefined ? stretching[pose.stretchFrame] : undefined)
          ?? poses[pose.frame] ?? sitting);
      art.texture = selected.texture;
      art.anchor.set(selected.horizontalAnchor, selected.footAnchor);
      const size = sceneScale * 0.25 * selected.normalization;
      art.scale.set(turnDirection * size, size);
      art.position.set(pose.x, footY);
      // No breathing deformation: the reviewed curled frame is held still.
    },
    destroy() {
      for (const texture of textures) texture.destroy(false);
      for (const texture of ownedSeatedTextures) texture.destroy(true);
      for (const texture of ownedRisingTextures) texture.destroy(true);
    },
  };
}
