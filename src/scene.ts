import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { catPose, travelPosition, windowBrightness } from './animation';
import { generatedArt } from './generated-art';
import { generatedLayout } from './generated-layout';
import { createImageCat } from './image-cat';
import { pixelViewport } from './pixel-viewport';
import { createImageStreetCar } from './image-street-car';

type Frame = readonly [number, number, number, number];

/** Display reviewed image-generation assets; runtime code only positions and composites them. */
export async function createScene(host: HTMLElement): Promise<{
  setMotion(enabled: boolean): void;
  destroy(): void;
}> {
  const baseUrl = new URL('.', document.baseURI).href;
  const [background, wideBackground, portraitBackground, atlas, restAtlas, walkAtlas, back, lift, groomAtlas, settleAtlas, streetCar] = await Promise.all([
    Assets.load<Texture>(`${baseUrl}${generatedArt.background}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.wide.background}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.portrait.background}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.atlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catRestAtlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catWalkAtlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catWalkBack}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catWalkLift}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catGroomAtlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catSettleAtlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.streetCar.image}`),
  ]);
  background.source.scaleMode = 'nearest';
  wideBackground.source.scaleMode = 'nearest';
  portraitBackground.source.scaleMode = 'nearest';
  atlas.source.scaleMode = 'nearest';
  restAtlas.source.scaleMode = 'nearest';
  for (const image of [walkAtlas, back, lift, groomAtlas, settleAtlas]) image.source.scaleMode = 'nearest';
  const imageCat = createImageCat(atlas, restAtlas, walkAtlas, back, lift, groomAtlas, settleAtlas);
  const imageStreetCar = createImageStreetCar(streetCar, [background, wideBackground, portraitBackground]);
  let roadCar: ReturnType<typeof imageStreetCar.createSprite>;
  const crops: Texture[] = [];
  const crop = (source: Texture, frame: Frame) => {
    const texture = new Texture({ source: source.source, frame: new Rectangle(...frame) });
    crops.push(texture);
    return texture;
  };
  const frames = {
    train: crop(atlas, generatedArt.frames.train),
    aircraft: crop(atlas, generatedArt.frames.aircraft),
    cloud: crop(atlas, generatedArt.frames.cloud),
  };
  const railPoles = (source: Texture, frames: readonly Frame[]) =>
    frames.map(frame => ({ texture: crop(source, frame), frame }));
  const compositionTextures = [
    { background, darkWall: crop(background, generatedArt.darkWall), darkSky: crop(background, generatedArt.darkSky),
      floorPatch: crop(background, generatedArt.floorPatch), railPoles: railPoles(background, generatedArt.railPoles) },
    { background: wideBackground, darkWall: crop(wideBackground, generatedArt.wide.darkWall),
      darkSky: crop(wideBackground, generatedArt.wide.darkSky), floorPatch: crop(wideBackground, generatedArt.wide.floorPatch),
      railPoles: railPoles(wideBackground, generatedArt.wide.railPoles) },
    { background: portraitBackground, darkWall: crop(portraitBackground, generatedArt.portrait.darkWall),
      darkSky: crop(portraitBackground, generatedArt.portrait.darkSky), floorPatch: crop(portraitBackground, generatedArt.portrait.floorPatch),
      railPoles: railPoles(portraitBackground, generatedArt.portrait.railPoles) },
  ];
  const app = new Application();
  await app.init({ width: 768, height: 512, antialias: false, resolution: 1,
    background: '#101326', preference: 'webgl', autoStart: false });
  const canvas = app.canvas;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '星が瞬く東京の夜景。電車と飛行機がゆっくり行き交い、屋上で猫が歩き、毛づくろいをしたり丸くなって休んだりしながら、窓の灯りが移ろいます。');
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  host.append(canvas);
  app.ticker.maxFPS = 20;
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed = 0;
  let width = 768;
  let height = 512;
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let catY = 470;
  let actorScale = 1;
  let train: Sprite;
  let trainInitialX = 0;
  let aircraft: Sprite;
  let cloud: Sprite;
  let cat: Sprite;
  let windows: Sprite[] = [];
  let stars: Sprite[] = [];
  const sprite = (texture: Texture) => {
    const art = new Sprite(texture);
    art.roundPixels = true;
    app.stage.addChild(art);
    return art;
  };
  const sourceX = (value: number) => Math.round(originX + value * scale);
  const sourceY = (value: number) => Math.round(originY + value * scale);

  function build() {
    const bounds = host.getBoundingClientRect();
    const viewport = pixelViewport(bounds.width, bounds.height, devicePixelRatio);
    width = viewport.width;
    height = viewport.height;
    app.renderer.resize(width, height);
    canvas.style.width = `${viewport.cssWidth}px`;
    canvas.style.height = `${viewport.cssHeight}px`;
    for (const child of app.stage.removeChildren()) child.destroy({ children: true });
    const layout = generatedLayout(width, height);
    const composition = layout.composition;
    const textures = compositionTextures[layout.portrait ? 2 : layout.wide ? 1 : 0];
    scale = layout.scale;
    actorScale = composition.actorScale;
    originX = layout.originX;
    originY = layout.originY;
    // Only uncovered edges use crops from the reviewed source image.
    const topGap = Math.max(0, originY);
    if (topGap) {
      const skyEdge = sprite(textures.darkSky);
      skyEdge.width = width;
      skyEdge.height = topGap;
    }
    const bottomStart = Math.max(0, originY + composition.height * scale);
    if (bottomStart < height) {
      const floorEdge = sprite(textures.floorPatch);
      floorEdge.position.set(0, bottomStart);
      floorEdge.width = width;
      floorEdge.height = height - bottomStart;
    }
    const backdrop = sprite(textures.background);
    backdrop.position.set(originX, originY);
    backdrop.scale.set(scale);
    stars = composition.stars.map(([x, y, w, h]) => {
      const art = sprite(textures.darkSky);
      art.position.set(sourceX(x), sourceY(y));
      art.width = w * scale;
      art.height = h * scale;
      return art;
    });
    windows = composition.windows.map(([x, y, w, h]) => {
      const art = sprite(textures.darkWall);
      art.position.set(sourceX(x), sourceY(y));
      art.width = w * scale;
      art.height = h * scale;
      return art;
    });
    roadCar = imageStreetCar.createSprite(layout.portrait ? 2 : layout.wide ? 1 : 0, scale, originX, originY);
    app.stage.addChild(roadCar.root);
    cloud = sprite(frames.cloud);
    cloud.scale.set(layout.cloudScale);
    cloud.y = layout.cloudY;
    cloud.alpha = 0.35;
    aircraft = sprite(frames.aircraft);
    aircraft.scale.set(layout.aircraftScale);
    aircraft.y = layout.aircraftY;
    train = sprite(frames.train);
    train.scale.set(scale * 0.24 * actorScale);
    train.y = layout.railBottom - train.height;
    trainInitialX = width * 0.1;
    let nearestPoleDistance = Infinity;
    // Restore only the reviewed background's pole pixels over the passing train.
    for (const { texture, frame: [x, y, w, h] } of textures.railPoles) {
      const pole = sprite(texture);
      pole.position.set(sourceX(x), sourceY(y));
      pole.scale.set(scale);
      if (pole.x + w * scale <= 0 || pole.x >= width || pole.y + h * scale <= 0 || pole.y >= height) continue;
      const center = sourceX(x + w / 2);
      const distance = Math.abs(center - width * 0.25);
      if (distance < nearestPoleDistance) {
        nearestPoleDistance = distance;
        trainInitialX = center - train.width / 2;
      }
    }
    cat = imageCat.createSprite();
    app.stage.addChild(cat);
    catY = layout.catY;
    animate();
    app.renderer.render(app.stage);
  }

  function animate() {
    imageStreetCar.update(roadCar, elapsed);
    stars.forEach((art, index) => { art.alpha = 0.4 + Math.sin(elapsed * 0.24 + index * 1.7) * 0.35; });
    windows.forEach((art, index) => { art.alpha = 0.92 * (1 - windowBrightness(elapsed, 5 + index * 11, 29 + index * 7)); });
    cloud.x = travelPosition(elapsed, width, cloud.width, scale * 1.2, width * 0.12);
    aircraft.x = travelPosition(elapsed, width, aircraft.width, scale * 3.2, width * 0.7);
    train.x = travelPosition(elapsed, width, train.width, scale * 8, trainInitialX);
    const pose = catPose(elapsed, width, scale * actorScale);
    imageCat.update(cat, pose, scale * actorScale, catY);
  }
  app.ticker.add(ticker => { elapsed += ticker.deltaMS / 1000; animate(); });
  const updateActivity = () => {
    const running = motion && !document.hidden;
    canvas.dataset.motion = running ? 'running' : 'paused';
    if (running) app.start(); else app.stop();
  };
  const observer = new ResizeObserver(() => { build(); updateActivity(); });
  let densityQuery: MediaQueryList | undefined;
  const observeDensity = () => {
    densityQuery?.removeEventListener('change', updateDensity);
    densityQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    densityQuery.addEventListener('change', updateDensity);
  };
  function updateDensity() { observeDensity(); build(); updateActivity(); }
  build();
  observer.observe(host);
  observeDensity();
  document.addEventListener('visibilitychange', updateActivity);
  updateActivity();
  return {
    setMotion(enabled) { motion = enabled; updateActivity(); },
    destroy() {
      observer.disconnect();
      densityQuery?.removeEventListener('change', updateDensity);
      document.removeEventListener('visibilitychange', updateActivity);
      app.destroy(true, { children: true });
      for (const texture of crops) texture.destroy(false);
      imageCat.destroy();
      imageStreetCar.destroy();
      // Assets owns the shared image sources; sprite/crop disposal must not destroy them.
    },
  };
}
