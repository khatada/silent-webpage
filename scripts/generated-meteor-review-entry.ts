import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { createImageMeteor, meteorArt, meteorGeometry } from '../src/image-meteor';
import { meteorState } from '../src/meteor-timing';

const viewports = [
  ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['narrow', 295, 844, 1],
  ['landscape', 844, 390, 2], ['wide', 2560, 1080, 1], ['compact', 800, 600, 1],
  ['tall', 390, 1025, 2], ['portrait-large', 900, 1600, 1], ['portrait-boundary', 1024, 1537, 1],
  ['small-phone', 320, 568, 2], ['small-mobile', 375, 667, 2],
] as const;

/** Native sky contexts from all production layouts, with the same generated sprite factory. */
export async function renderGeneratedMeteorReview() {
  const times = [6.15, 7, 7.85, 8];
  const layouts = viewports.map(([name, cssWidth, cssHeight, dpr]) => {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const path = meteorGeometry(viewport.width, layout.skyBottom);
    return { name, viewport, layout, path, contextX: path.x - 8,
      contextWidth: Math.ceil(path.dx + path.width + 16) };
  });
  const columnWidth = Math.max(...layouts.map(item => item.contextWidth));
  const width = columnWidth * times.length;
  const height = layouts.reduce((sum, item) => sum + item.layout.skyBottom + 8, 0);
  const [material, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${meteorArt.image}`),
    ...[generatedArt.background, generatedArt.wide.background, generatedArt.portrait.background]
      .map(path => Assets.load<Texture>(`/${path}`)),
  ]);
  const factory = createImageMeteor(material);
  const app = new Application();
  await app.init({ width, height, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  let rowY = 0;
  for (const item of layouts) {
    const { layout, viewport, path, contextX, contextWidth } = item;
    for (const [column, seconds] of times.entries()) {
      const target = RenderTexture.create({ width: viewport.width, height: layout.skyBottom });
      const root = new Container();
      const source = backgrounds[layout.portrait ? 2 : layout.wide ? 1 : 0];
      if (layout.originY > 0) {
        const sky = new Sprite(new Texture({ source: source.source,
          frame: new Rectangle(...layout.composition.darkSky) }));
        sky.width = viewport.width;
        sky.height = layout.originY;
        root.addChild(sky);
      }
      const background = new Sprite(source);
      background.texture.source.scaleMode = 'nearest';
      background.position.set(layout.originX, layout.originY);
      background.scale.set(layout.scale);
      root.addChild(background);
      const meteor = factory.createSprite(viewport.width, layout.skyBottom);
      factory.update(meteor, seconds, viewport.width, layout.skyBottom);
      root.addChild(meteor);
      app.renderer.render({ container: root, target });
      // Render target crop retains the full production sampling phase and native pixels.
      const crop = new Texture({ source: target.source,
        frame: new Rectangle(contextX, 0, contextWidth, layout.skyBottom) });
      crop.source.scaleMode = 'nearest';
      const panel = new Sprite(crop);
      panel.position.set(column * columnWidth, rowY);
      app.stage.addChild(panel);
      samples.push({ name: item.name, viewport, layout: { scale: layout.scale, originX: layout.originX,
        originY: layout.originY, skyBottom: layout.skyBottom }, path, seconds, state: meteorState(seconds),
        context: [contextX, 0, contextWidth, layout.skyBottom], panel: [column * columnWidth, rowY] });
    }
    rowY += layout.skyBottom + 8;
  }
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width, height, rows: viewports.map(item => item[0]), columns: times, samples };
}
