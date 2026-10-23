import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { generatedArt } from '../src/generated-art';
import { createImageSteam, steamArt } from '../src/image-steam';
import { steamState } from '../src/steam-timing';

/** All production phases on the actual cup, preserving the background's sampling phase. */
export async function renderGeneratedSteamReview(options: { scales?: readonly number[]; phases?: readonly number[]; alphas?: readonly number[] } = {}) {
  const scales = options.scales ?? [1, 0.5, 4];
  const phases = options.phases ?? [-1, 0, 1, 2, 3, 4, 5];
  const alphas = options.alphas ?? [0.4];
  const width = phases.length * 192, height = 2 * scales.length * alphas.length * 240;
  const [source, ...backgrounds] = await Promise.all([
    Assets.load<Texture>(`/${steamArt.image}`),
    ...[generatedArt.background, generatedArt.portrait.background].map(path => Assets.load<Texture>(`/${path}`)),
  ]);
  backgrounds.forEach(texture => { texture.source.scaleMode = 'nearest'; });
  const steam = createImageSteam(source);
  const app = new Application();
  await app.init({ width, height, resolution: 1, antialias: false,
    background: '#171e30', preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples: unknown[] = [];
  steamArt.placements.forEach((placement, composition) => {
    const context = placement.context;
    const texture = new Texture({ source: backgrounds[composition].source, frame: new Rectangle(...context) });
    alphas.forEach((alpha, alphaIndex) => {
    scales.forEach((scale, scaleIndex) => {
      phases.forEach((phase, column) => {
        const panelX = column * 192 + 8, panelY = ((composition * alphas.length + alphaIndex) * scales.length + scaleIndex) * 240 + 8;
        const rootX = Math.round(panelX - context[0] * scale), rootY = Math.round(panelY - context[1] * scale);
        const contextX = rootX + context[0] * scale, contextY = rootY + context[1] * scale;
        const surrounding = new Sprite(texture);
        surrounding.position.set(contextX, contextY);
        surrounding.scale.set(scale);
        app.stage.addChild(surrounding);
        const seconds = phase * 0.75 + 0.375;
        if (phase >= 0) {
          const sprite = steam.createSprite(composition as 0 | 1, scale, rootX, rootY);
          steam.update(sprite, seconds);
          sprite.alpha *= alpha / 0.4;
          app.stage.addChild(sprite);
        }
        samples.push({ composition, context, scale, alpha, phase, seconds: phase < 0 ? null : seconds,
          state: phase < 0 ? null : steamState(seconds), emitter: placement.emitter, safe: placement.safe,
          rootX, rootY, contextX, contextY, panel: [panelX, panelY, 192, 240] });
      });
    });
  });
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width, height, samples,
    rows: ['normal', 'portrait'].flatMap(name => alphas.flatMap(alpha => scales.map(scale => `${name}-${scale}x-alpha${alpha}`))),
    columns: phases.map(phase => phase < 0 ? 'original' : `phase${phase}`) };
}

export async function renderGeneratedSteamAlphaReview() {
  return renderGeneratedSteamReview({ scales: [1, 4], phases: [-1, 2, 3, 4], alphas: [0.25, 0.4, 0.55] });
}
