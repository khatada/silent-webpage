import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageFan, fanArt } from '../src/image-fan';
import { fanFrame } from '../src/fan-timing';

/** Original context and all four production poses, at native size and 4x. */
export async function renderGeneratedFanReview() {
  const [source, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${fanArt.image}`),
    ...[generatedArt.background, generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)),
  ]);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const fan = createImageFan(source, backgrounds);
  const app = new Application();
  await app.init({ width: 1440, height: 1000, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  fanArt.placements.forEach((placement, composition) => {
    const context = placement.context;
    const texture = new Texture({ source: backgrounds[composition].source, frame: new Rectangle(...context) });
    [1, 4].forEach((scale, scaleIndex) => {
      [-1, 0, 1, 2, 3].forEach((phase, column) => {
        const panelX = column * 288 + 12, panelY = (composition * 2 + scaleIndex) * 250 + 20;
        const rootX = panelX - context[0] * scale, rootY = panelY - context[1] * scale;
        const surrounding = new Sprite(texture);
        surrounding.position.set(panelX, panelY);
        surrounding.scale.set(scale);
        app.stage.addChild(surrounding);
        if (phase >= 0) {
          const sprite = fan.createSprite(composition as 0 | 1, scale, rootX, rootY);
          fan.update(sprite, phase * 0.4 + 0.1);
          app.stage.addChild(sprite.root);
        }
        samples.push({ composition, context, scale, phase, seconds: phase < 0 ? null : phase * 0.4 + 0.1,
          actualFrame: phase < 0 ? null : fanFrame(phase * 0.4 + 0.1), panel: [panelX, panelY, 288, 250] });
      });
    });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 1440, height: 1000, samples,
    rows: ['normal-native', 'normal-4x', 'portrait-native', 'portrait-4x'],
    columns: ['original', 'phase0', 'phase1', 'phase2', 'phase3'] };
}
