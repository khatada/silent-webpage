import { createLogicalBackground } from '../src/logical-background';
import { Application, Assets, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { generatedLayout } from '../src/generated-layout';
import { createImageUpperCloud, upperCloudGeometry } from '../src/image-upper-cloud';
import { travelPosition } from '../src/animation';

const views = [['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 295, 844],
  ['landscape', 844, 390], ['wide', 2560, 1080], ['compact', 800, 600], ['tall', 390, 1025],
  ['portrait-large', 900, 1600], ['portrait-boundary', 1024, 1537], ['small-phone', 320, 568], ['small-mobile', 375, 667]] as const;

/** Choose actual closest horizontal approaches over one upper-cloud crossing; never simulate a wait. */
function closestTime(width: number, scale: number, upperWidth: number, otherWidth: number, speed: number, initial: number) {
  let bestTime = 0, bestDistance = Infinity;
  for (let seconds = 0; seconds <= (width + upperWidth) / (scale * 0.35); seconds++) {
    const upper = travelPosition(seconds, width, upperWidth, scale * 0.35, width * 0.65);
    const other = travelPosition(seconds, width, otherWidth, speed, initial);
    if (upper + upperWidth <= 0 || upper >= width || other + otherWidth <= 0 || other >= width) continue;
    const distance = Math.abs(upper + upperWidth / 2 - other - otherWidth / 2);
    if (distance < bestDistance) { bestTime = seconds; bestDistance = distance; }
  }
  return bestTime;
}

export async function renderGeneratedUpperCloudReview() {
  const layouts = views.map(([name, width, height]) => ({ name, width, height, layout: generatedLayout(width, height) }));
  const width = 1050, height = layouts.reduce((sum, item) => sum + item.layout.skyBottom + 8, 0);
  const materials = await Promise.all([generatedArt.atlas, generatedArt.background, generatedArt.wide.background,
    generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)));
  materials[2] = createLogicalBackground(materials[2], generatedArt.wide.width,
    generatedArt.wide.height, generatedArt.wide.resolution);
  materials.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const cloudTexture = new Texture({ source: materials[0].source, frame: new Rectangle(...generatedArt.frames.cloud) });
  const aircraftTexture = new Texture({ source: materials[0].source, frame: new Rectangle(...generatedArt.frames.aircraft) });
  const factory = createImageUpperCloud(cloudTexture);
  const app = new Application();
  await app.init({ width, height, resolution: 1, antialias: false, background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  const reviewLayouts: Record<string, unknown> = {};
  let rowY = 0;
  for (const { name, width: viewWidth, height: viewHeight, layout } of layouts) {
    reviewLayouts[name] = { ...layout, composition: layout.portrait ? 'portrait' : layout.wide ? 'wide' : 'normal' };
    const geometry = upperCloudGeometry(layout);
    const times = [0,
      closestTime(viewWidth, layout.scale, geometry.width, 235 * layout.cloudScale, layout.scale * 1.2, viewWidth * 0.12),
      closestTime(viewWidth, layout.scale, geometry.width, aircraftTexture.width * layout.aircraftScale, layout.scale * 3.2, viewWidth * 0.7)];
    times.forEach((seconds, column) => {
      const target = RenderTexture.create({ width: viewWidth, height: layout.skyBottom });
      const root = new Container();
      const source = materials[layout.portrait ? 3 : layout.wide ? 2 : 1];
      if (layout.originY > 0) {
        const sky = new Sprite(new Texture({ source: source.source, frame: new Rectangle(...layout.composition.darkSky) }));
        sky.width = viewWidth; sky.height = layout.originY; root.addChild(sky);
      }
      const background = new Sprite(source);
      background.position.set(layout.originX, layout.originY); background.scale.set(layout.scale); root.addChild(background);
      const upper = factory.createSprite(layout);
      factory.update(upper, seconds, viewWidth, layout.scale); root.addChild(upper);
      const lower = new Sprite(cloudTexture);
      lower.scale.set(layout.cloudScale); lower.y = layout.cloudY; lower.alpha = 0.35;
      lower.x = travelPosition(seconds, viewWidth, lower.width, layout.scale * 1.2, viewWidth * 0.12); root.addChild(lower);
      const plane = new Sprite(aircraftTexture);
      plane.scale.set(layout.aircraftScale); plane.y = layout.aircraftY;
      plane.x = travelPosition(seconds, viewWidth, plane.width, layout.scale * 3.2, viewWidth * 0.7); root.addChild(plane);
      app.renderer.render({ container: root, target });
      const contextWidth = Math.min(350, viewWidth);
      const contextX = Math.max(0, Math.min(viewWidth - contextWidth, Math.floor(upper.x - 32)));
      const context = [contextX, 0, contextWidth, layout.skyBottom] as const;
      const texture = new Texture({ source: target.source, frame: new Rectangle(...context) });
      texture.source.scaleMode = 'nearest';
      const panel = new Sprite(texture); panel.position.set(column * 350, rowY); app.stage.addChild(panel);
      samples.push({ name, viewWidth, viewHeight, column, seconds, geometry, layoutRef: name,
        upper: { x: upper.x, y: upper.y, width: upper.width, alpha: upper.alpha, visible: upper.visible },
        lower: { x: lower.x, y: lower.y, width: lower.width }, plane: { x: plane.x, y: plane.y, width: plane.width },
        context, panel: [column * 350, rowY] });
    });
    rowY += layout.skyBottom + 8;
  }
  app.renderer.render(app.stage); app.canvas.dataset.ready = 'true';
  return { width, height, samples, layouts: reviewLayouts,
    compositionDefinitions: { source: 'src/generated-art.ts', revision: 'sourceSha256',
      keys: { normal: 'generatedArt', wide: 'generatedArt.wide', portrait: 'generatedArt.portrait' } }, rows: views.map(view => view[0]), columns: ['initial', 'nearest-lower-cloud', 'nearest-aircraft'] };
}
