import { Application } from 'pixi.js';
import { catPose } from '../src/animation';
import { createRooftopCat } from '../src/rooftop-cat';

/** Render the actual cat poses once, without running the full scene or its clock. */
export async function renderCatReview() {
  const app = new Application();
  await app.init({
    width: 360, height: 120, resolution: 1, antialias: false,
    background: 0x171e30, preference: 'webgl', autoStart: false,
  });
  document.body.append(app.canvas);
  const samples = [25.5, 27, 29].map((seconds, index) => {
    const pose = catPose(seconds, 640);
    const cat = createRooftopCat();
    cat.update(pose);
    const x = 60 + index * 120;
    cat.art.position.set(x, 90);
    cat.art.scale.set(4 * pose.direction, 4);
    app.stage.addChild(cat.art);
    return { seconds, pose, atlasPosition: { x, y: 90 } };
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 360, height: 120, displayScale: 4, samples };
}
