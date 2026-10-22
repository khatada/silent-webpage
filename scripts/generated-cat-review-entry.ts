import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { catPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';
import { walkingFrame, walkingPhaseOffsets, walkingSourceStride, walkingStride } from '../src/walking-timing';

/** Compose reviewed generated images with exactly the production frame selection and alignment. */
export async function renderGeneratedCatReview() {
  const [atlas, rest, walk, back, lift, background, groom, settle, stretch, stretchMid] = await Promise.all([
    Assets.load<Texture>(`/${generatedArt.atlas}`),
    Assets.load<Texture>(`/${generatedArt.catRestAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catWalkAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catWalkBack}`),
    Assets.load<Texture>(`/${generatedArt.catWalkLift}`),
    Assets.load<Texture>(`/${generatedArt.background}`),
    Assets.load<Texture>(`/${generatedArt.catGroomAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catSettleAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catStretchAtlas}`),
    Assets.load<Texture>(`/${generatedArt.catStretchMid}`),
  ]);
  for (const texture of [atlas, rest, walk, back, lift, background, groom, settle, stretch, stretchMid]) texture.source.scaleMode = 'nearest';
  const cat = createImageCat(atlas, rest, walk, back, lift, groom, settle, stretch, stretchMid);
  const app = new Application();
  await app.init({ width: 1920, height: 2400, resolution: 1, antialias: false,
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
  // Include both surrounding postures and all nine grooming intervals over generated floor pixels.
  const groomingTimes = [20.9, 21.1, 21.35, 21.8, 22.35, 22.75, 23.2, 23.6, 23.85, 24.4, 26.6];
  for (const direction of [1, -1] as const) {
    const rowY = direction === 1 ? 960 : 1200;
    const footY = rowY + 220;
    groomingTimes.forEach((seconds, index) => {
      const panelX = index * 174 + 3;
      const floorSprite = new Sprite(floor);
      floorSprite.position.set(panelX, rowY);
      floorSprite.width = 174;
      floorSprite.height = 240;
      app.stage.addChild(floorSprite);
      const pose = catPose(seconds + (direction === 1 ? 0 : 32), 640);
      const sprite = cat.createSprite();
      const x = panelX + 87;
      cat.update(sprite, { ...pose, x }, sceneScale, footY);
      app.stage.addChild(sprite);
      samples.push({ kind: 'grooming-sequence', seconds, direction, pose, x, footY,
        floorCrop: [280, 420, 120, 92] });
    });
  }
  // Endpoints reuse the exact production grooming/curled textures, not approximate generated copies.
  const settlingTimes = [24.9, 25.1, 25.35, 25.6, 25.85, 26.1, 26.35, 26.6];
  for (const direction of [1, -1] as const) {
    const rowY = direction === 1 ? 1440 : 1680;
    const footY = rowY + 220;
    settlingTimes.forEach((seconds, index) => {
      const panelX = index * 240;
      const floorSprite = new Sprite(floor);
      floorSprite.position.set(panelX, rowY);
      floorSprite.width = 240;
      floorSprite.height = 240;
      app.stage.addChild(floorSprite);
      const pose = catPose(seconds + (direction === 1 ? 0 : 32), 640);
      const sprite = cat.createSprite();
      const x = panelX + 120;
      cat.update(sprite, { ...pose, x }, sceneScale, footY);
      app.stage.addChild(sprite);
      samples.push({ kind: 'settling-sequence', seconds, direction, pose, x, footY,
        floorCrop: [280, 420, 120, 92] });
    });
  }
  const stretchingTimes = [29.9, 30.1, 30.35, 30.6, 30.85, 31.1, 31.35, 31.6];
  for (const direction of [1, -1] as const) {
    const rowY = direction === 1 ? 1920 : 2160;
    const footY = rowY + 220;
    stretchingTimes.forEach((seconds, index) => {
      const panelX = index * 240;
      const floorSprite = new Sprite(floor);
      floorSprite.position.set(panelX, rowY);
      floorSprite.width = 240;
      floorSprite.height = 240;
      app.stage.addChild(floorSprite);
      const pose = catPose(seconds + (direction === 1 ? 0 : 32), 640);
      const sprite = cat.createSprite();
      const x = panelX + 120;
      cat.update(sprite, { ...pose, x }, sceneScale, footY);
      app.stage.addChild(sprite);
      samples.push({ kind: 'stretching-sequence', seconds, direction, pose, x, footY,
        floorCrop: [280, 420, 120, 92] });
    });
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1920, height: 2400, sceneScale, walkingPoses: 16, restingPoses: 7,
    movingPanels: 16, groomingSequencePoses: 22, settlingSequencePoses: 16, stretchingSequencePoses: 16, samples };
}
