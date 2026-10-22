import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { catLegDuration, catPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';
import { walkingFrame } from '../src/walking-timing';

/** Generated floor and production compositor, including the viewport-dependent next gait frame. */
export async function renderGeneratedCatTurnReview() {
  const names = ['atlas', 'catRestAtlas', 'catWalkAtlas', 'catWalkBack', 'catWalkLift',
    'catGroomAtlas', 'catSettleAtlas', 'catStretchAtlas', 'catStretchMid', 'catTurnAtlas', 'background'] as const;
  const textures = await Promise.all(names.map(name => Assets.load<Texture>(`/${generatedArt[name]}`)));
  for (const texture of textures) texture.source.scaleMode = 'nearest';
  const [atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn, background] = textures;
  const cat = createImageCat(atlas, rest, walk, back, lift, groom, settle, stretch, mid, turn);
  const floor = new Texture({ source: background.source, frame: new Rectangle(280, 420, 120, 92) });
  const app = new Application();
  await app.init({ width: 1920, height: 2400, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  let panel = 0;
  const show = (seconds: number, width: number, scale: number, kind: string) => {
    const left = panel % 8 * 240;
    const top = Math.floor(panel / 8) * 240;
    const floorSprite = new Sprite(floor);
    floorSprite.position.set(left, top);
    floorSprite.width = floorSprite.height = 240;
    app.stage.addChild(floorSprite);
    const pose = catPose(seconds, width, scale);
    const sprite = cat.createSprite();
    cat.update(sprite, pose, scale, top + 220);
    // Select using the actual route endpoint, then translate the complete composition into its panel.
    sprite.x = left + 120;
    app.stage.addChild(sprite);
    samples.push({ panel, kind, seconds, width, scale, pose, floorCrop: [280, 420, 120, 92],
      nextWalkingPhase: walkingFrame(pose.x, pose.turnFrame === 7 ? -pose.direction as 1 | -1 : pose.direction, scale) });
    panel++;
    return sprite;
  };
  for (const offset of [0, catLegDuration]) {
    for (const seconds of [32.1, 32.5, 33, 33.5, 34, 34.5, 35, 35.9]) {
      show(seconds + offset, 640, 4, 'turn-sequence');
    }
  }
  const coverage: unknown[] = [];
  for (const scale of [1, 4]) {
    for (const offset of [0, catLegDuration]) {
      for (let phase = 0; phase < 8; phase++) {
        // Width changes the absolute endpoint and therefore the production walk phase.
        let width = 140;
        while (width < 5000) {
          const endpoint = catPose(catLegDuration + offset, width, scale);
          if (walkingFrame(endpoint.x, endpoint.direction, scale) === phase) break;
          width++;
        }
        if (width === 5000) throw new Error(`Missing phase ${phase}`);
        const before = show(catLegDuration - 0.001 + offset, width, scale, 'endpoint-before');
        const after = show(catLegDuration + offset, width, scale, 'endpoint-after');
        const identical = before.texture === after.texture && before.anchor.equals(after.anchor)
          && before.scale.equals(after.scale);
        if (!identical) throw new Error(`Endpoint composition mismatch ${scale}/${offset}/${phase}`);
        coverage.push({ scale, offset, phase, width, identical });
      }
    }
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1920, height: 2400, panels: panel, sequencePanels: 16, endpointPairs: 32, coverage, samples };
}
