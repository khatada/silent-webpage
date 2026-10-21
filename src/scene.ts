import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { catPose, travelPosition, windowBrightness } from './animation';
import { generatedArt } from './generated-art';
import { pixelViewport } from './pixel-viewport';

type Frame = readonly [number, number, number, number];

/** Display reviewed image-generation assets; runtime code only positions and composites them. */
export async function createScene(host: HTMLElement): Promise<{
  setMotion(enabled: boolean): void;
  destroy(): void;
}> {
  const baseUrl = new URL('.', document.baseURI).href;
  const [background, atlas] = await Promise.all([
    Assets.load<Texture>(`${baseUrl}${generatedArt.background}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.atlas}`),
  ]);
  background.source.scaleMode = 'nearest';
  atlas.source.scaleMode = 'nearest';
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
    walkOne: crop(atlas, generatedArt.frames.walkOne),
    walkTwo: crop(atlas, generatedArt.frames.walkTwo),
    sitting: crop(atlas, generatedArt.frames.sitting),
  };
  const darkWall = crop(background, generatedArt.darkWall);
  const darkSky = crop(background, generatedArt.darkSky);
  const app = new Application();
  await app.init({ width: 768, height: 512, antialias: false, resolution: 1,
    background: '#101326', preference: 'webgl', autoStart: false });
  const canvas = app.canvas;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '星が瞬く東京の夜景。電車と飛行機がゆっくり行き交い、屋上で猫が歩いて休み、窓の灯りが移ろいます。');
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
  let train: Sprite;
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
    // Integer magnification keeps the corrected source-image grid intact.
    scale = Math.ceil(Math.max(width / generatedArt.width, height / generatedArt.height));
    originX = Math.round((width - generatedArt.width * scale) / 2);
    const centeredY = Math.round((height - generatedArt.height * scale) / 2);
    // Preserve some rooftop floor even on very wide windows.
    originY = Math.min(centeredY, height - generatedArt.floor * scale - 18 * scale);
    const backdrop = sprite(background);
    backdrop.position.set(originX, originY);
    backdrop.scale.set(scale);
    stars = generatedArt.stars.map(([x, y, w, h]) => {
      const art = sprite(darkSky);
      art.position.set(sourceX(x), sourceY(y));
      art.width = w * scale;
      art.height = h * scale;
      return art;
    });
    windows = generatedArt.windows.map(([x, y, w, h]) => {
      const art = sprite(darkWall);
      art.position.set(sourceX(x), sourceY(y));
      art.width = w * scale;
      art.height = h * scale;
      return art;
    });
    cloud = sprite(frames.cloud);
    cloud.scale.set(scale * 0.7);
    cloud.y = sourceY(90);
    cloud.alpha = 0.35;
    aircraft = sprite(frames.aircraft);
    aircraft.scale.set(scale * 0.17);
    aircraft.y = sourceY(78);
    train = sprite(frames.train);
    train.scale.set(scale * 0.24);
    train.y = sourceY(generatedArt.railBottom) - train.height;
    cat = sprite(frames.walkOne);
    cat.anchor.set(0.5, 1);
    cat.scale.set(scale * 0.25);
    catY = Math.min(height - 8 * scale, sourceY(generatedArt.floor));
    animate();
    app.renderer.render(app.stage);
  }

  function animate() {
    stars.forEach((art, index) => { art.alpha = 0.4 + Math.sin(elapsed * 0.24 + index * 1.7) * 0.35; });
    windows.forEach((art, index) => { art.alpha = 0.92 * (1 - windowBrightness(elapsed, 5 + index * 11, 29 + index * 7)); });
    cloud.x = travelPosition(elapsed, width, cloud.width, scale * 1.2, width * 0.12);
    aircraft.x = travelPosition(elapsed, width, aircraft.width, scale * 3.2, width * 0.7);
    train.x = travelPosition(elapsed, width, train.width, scale * 8, width * 0.1);
    const pose = catPose(elapsed, width);
    cat.texture = pose.frame < 4 ? (pose.frame % 2 ? frames.walkTwo : frames.walkOne) : frames.sitting;
    cat.scale.set(pose.direction * scale * 0.25, scale * 0.25);
    cat.position.set(pose.x, catY);
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
      // Assets owns the two shared image sources; sprite/crop disposal must not destroy them.
    },
  };
}
