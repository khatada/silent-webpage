import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { catPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';
import { walkingFrame, walkingPhaseOffsets, walkingSourceStride, walkingStride } from '../src/walking-timing';

/** Compose reviewed generated images with exactly the production frame selection and alignment. */
export async function renderGeneratedCatReview() {
  const [atlas, rest, walk, back, lift, background] = await Promise.all([
    Assets.load<Texture>(`/${generatedArt.atlas}`),
    Assets.load<Texture>(`/${generatedArt.catRestAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catWalkAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catWalkBack}`),
    Assets.load<Texture>(`/${generatedArt.catWalkLift}`),
    Assets.load<Texture>(`/${generatedArt.background}`),
  ]);
  for (const texture of [atlas, rest, walk, back, lift, background]) texture.source.scaleMode = 'nearest';
  const cat = createImageCat(atlas, rest, walk, back, lift);
  const app = new Application();
  await app.init({ width: 1920, height: 960, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const sceneScale = 4;
  const samples: unknown[] = [];
  for (const direction of [1, -1] as const) {
    const footY = direction === 1 ? 220 : 450;
    for (let index = 0; index < 8; index++) {
      const phaseX = direction * walkingStride(sceneScale) * walkingPhaseOffsets[index] / walkingSourceStride;
      const pose = { ...catPose(0, 640), direction, x: phaseX };
      const sprite = cat.createSprite();
      cat.update(sprite, pose, sceneScale, footY);
      sprite.x = 120 + index * 240;
      app.stage.addChild(sprite);
      samples.push({ kind: 'walking', direction, phase: walkingFrame(phaseX, direction, sceneScale),
        pose, x: sprite.x, footY });
    }
  }
  [18.5, 21.2, 22.2, 26.5, 30.5, 50.5, 62.5].forEach((seconds, index) => {
    const pose = catPose(seconds, 640);
    const sprite = cat.createSprite();
    cat.update(sprite, { ...pose, x: 135 + index * 274 }, sceneScale, 680);
    app.stage.addChild(sprite);
    samples.push({ kind: 'resting', seconds, pose, x: sprite.x, footY: 680 });
  });
  // Each panel repeats the same reviewed floor crop. Root movement is retained within the panel.
  const floor = new Texture({ source: background.source, frame: new Rectangle(280, 420, 120, 92) });
  const sourceDistances = [0, 16, 33, 48, 63, 75, 88, 100, 112, 126, 140, 152, 164, 174, 184, 192];
  const contactToes = [90, 57, 27];
  sourceDistances.forEach((distance, index) => {
    const panelX = index * 120;
    const floorSprite = new Sprite(floor);
    floorSprite.position.set(panelX, 720);
    floorSprite.width = 120;
    floorSprite.height = 240;
    app.stage.addChild(floorSprite);
    const filmScale = 1;
    const phaseX = distance * filmScale * 0.25;
    const pose = { ...catPose(0, 640, filmScale), x: phaseX };
    const sprite = cat.createSprite();
    cat.update(sprite, pose, filmScale, 920);
    const rootX = 30 + phaseX;
    sprite.x = panelX + rootX;
    app.stage.addChild(sprite);
    const phase = walkingFrame(phaseX, 1, filmScale);
    const toe = contactToes[phase];
    samples.push({ kind: 'moving-filmstrip', panel: index, sourceDistance: distance, phase,
      sceneScale: filmScale, rootX, footY: 920, floorCrop: [280, 420, 120, 92],
      nearForepawOffsetSource: toe ?? null,
      nearForepawFloorX: toe === undefined ? null : rootX + toe * filmScale * 0.25 });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1920, height: 960, sceneScale, walkingPoses: 16, restingPoses: 7, movingPanels: 16, samples };
}
