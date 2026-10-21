import { Application, Assets, Texture } from 'pixi.js';
import { catPose } from '../src/animation';
import { generatedArt } from '../src/generated-art';
import { createImageCat } from '../src/image-cat';

/** Compose existing generated images with the production API; never draw original artwork. */
export async function renderGeneratedCatReview() {
  const [atlas, rest] = await Promise.all([
    Assets.load<Texture>(`/${generatedArt.atlas}`),
    Assets.load<Texture>(`/${generatedArt.catRestAtlas}`),
  ]);
  atlas.source.scaleMode = 'nearest';
  rest.source.scaleMode = 'nearest';
  const cat = createImageCat(atlas, rest);
  const app = new Application();
  await app.init({ width: 1024, height: 240, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples = [0, 18.5, 21.2, 22.2, 26.5, 30.5, 62.5].map((seconds, index) => {
    const pose = catPose(seconds, 640);
    const sprite = cat.createSprite();
    cat.update(sprite, { ...pose, x: 72 + index * 140 }, 2, 170);
    app.stage.addChild(sprite);
    return { seconds, pose, footY: 170 };
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1024, height: 240, sceneScale: 2, samples };
}
