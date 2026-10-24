import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createImageStars, starCoreSampled, starScenes } from '../src/image-stars';

const views = [['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 295, 844],
  ['landscape', 844, 390], ['wide', 2560, 1080], ['compact', 800, 600], ['tall', 390, 1025],
  ['portrait-large', 900, 1600], ['portrait-boundary', 1024, 1537], ['small-phone', 320, 568],
  ['small-mobile', 375, 667], ['square-boundary', 375, 375], ['portrait-fallback-boundary', 600, 750],
  ['very-narrow', 100, 925], ['half-narrow', 100, 525], ['half-wide', 100, 100],
  ['tiny-discarded', 100, 150]] as const;

/** Check actual native sky pixels, including nearest reduction, instead of counting source rectangles. */
export async function renderStarCoverage() {
  const sources = await Promise.all([generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  sources.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const factory = createImageStars(sources);
  const app = new Application();
  const width = 192, height = views.length * 100;
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30',
    preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  views.forEach(([name, viewWidth, viewHeight], row) => {
    const layout = generatedLayout(viewWidth, viewHeight);
    const composition = layout.portrait ? 2 : layout.wide ? 1 : 0;
    const source = sources[composition];
    const root = new Container();
    if (layout.originY > 0) {
      const sky = new Sprite(new Texture({ source: source.source, frame: new Rectangle(...layout.composition.darkSky) }));
      sky.width = viewWidth; sky.height = layout.originY; root.addChild(sky);
    }
    const backdrop = new Sprite(source);
    backdrop.position.set(layout.originX, layout.originY); backdrop.scale.set(layout.scale); root.addChild(backdrop);
    const before = RenderTexture.create({ width: viewWidth, height: layout.skyBottom });
    app.renderer.render({ container: root, target: before });
    const actor = factory.createSprite(composition, layout.scale, layout.originX, layout.originY);
    factory.update(actor, 6); root.addChild(actor.root);
    const after = RenderTexture.create({ width: viewWidth, height: layout.skyBottom });
    app.renderer.render({ container: root, target: after });
    const original = app.renderer.extract.pixels(before).pixels;
    const rendered = app.renderer.extract.pixels(after).pixels;
    let changed = 0;
    for (let offset = 0; offset < original.length; offset += 4) {
      if (original[offset] !== rendered[offset] || original[offset + 1] !== rendered[offset + 1]
        || original[offset + 2] !== rendered[offset + 2] || original[offset + 3] !== rendered[offset + 3]) changed++;
    }
    const sampled = starScenes[composition].flatMap(({ core: [x, y] }, index) => {
      const px = layout.originX + x * layout.scale, py = layout.originY + y * layout.scale;
      return starCoreSampled(x, y, layout.scale) && px >= 0 && px < viewWidth && py >= 0 && py < layout.skyBottom
        ? [{ index, x: px, y: py }] : [];
    });
    if (row < 13 && !changed) throw new Error(`No actual twinkle pixels: ${name}`);
    if (name === 'tiny-discarded' && changed) throw new Error('Discarded source cores changed neighbours');
    const first = sampled[0];
    const contextWidth = Math.min(24, viewWidth), contextHeight = Math.min(24, layout.skyBottom);
    const context = [Math.max(0, Math.min(viewWidth - contextWidth, Math.floor((first?.x ?? 12) - 12))),
      Math.max(0, Math.min(layout.skyBottom - contextHeight, Math.floor((first?.y ?? 12) - 12))), contextWidth, contextHeight] as const;
    [before, after].forEach((target, column) => {
      const panel = new Sprite(new Texture({ source: target.source, frame: new Rectangle(...context) }));
      panel.texture.source.scaleMode = 'nearest'; panel.scale.set(4); panel.position.set(column * 96, row * 100);
      app.stage.addChild(panel);
    });
    samples.push({ name, viewWidth, viewHeight, composition, scale: layout.scale,
      origin: [layout.originX, layout.originY], skyBottom: layout.skyBottom, seconds: 6, sampled, changed, context, row });
  });
  app.renderer.render(app.stage); app.canvas.dataset.ready = 'true';
  return { width, height, samples };
}
