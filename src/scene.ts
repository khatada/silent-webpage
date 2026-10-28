import { createImageWideBackground } from './image-wide-background';
import { createImageRailPoles } from './image-rail-poles';
import { createLogicalBackground } from './logical-background';
import { Application, Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { catPose, travelPosition, windowBrightness } from './animation';
import { generatedArt } from './generated-art';
import { generatedLayout } from './generated-layout';
import { createImageCat } from './image-cat';
import { pixelViewport } from './pixel-viewport';
import { createImageStreetCar } from './image-street-car';
import { createImageCurtain, curtainArt } from './image-curtain';
import { createImageFan, fanArt } from './image-fan';
import { createImageResident, residentArt } from './image-resident';
import { createImageSteam, steamArt } from './image-steam';
import { createImageMeteor, meteorArt } from './image-meteor';
import { createImageLaundry, laundryArt } from './image-laundry';
import { createImageUpperCloud } from './image-upper-cloud';
import { createImageSkylineLights } from './image-skyline-lights';
import { createImageStars } from './image-stars';
import { createImageRoomLights } from './image-room-lights';
import { trainServiceOffsets } from './train-service';
import { createImagePlant, plantArt, plantGeometry } from './image-plant';
import { cityMotion, residentialLightCycle } from './city-motion';
import { oppositeAircraftArt, oppositeAircraftGeometry } from './opposite-aircraft';

type Frame = readonly [number, number, number, number];

/** Display reviewed image-generation assets; runtime code only positions and composites them. */
export async function createScene(host: HTMLElement): Promise<{
  setMotion(enabled: boolean): void;
  destroy(): void;
}> {
  const baseUrl = new URL('.', document.baseURI).href;
  const [background, loadedWideBackground, portraitBackground, atlas, restAtlas, walkAtlas, back, lift, groomAtlas, settleAtlas, streetCar, stretchAtlas, stretchMid, curtainAtlas, turnAtlas, fanAtlas, residentAtlas, steamAtlas, meteorAtlas, laundryAtlas, lookAtlas, plantAtlas, alternateTrain, riseAtlas] = await Promise.all([
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
    Assets.load<Texture>(`${baseUrl}${generatedArt.catStretchAtlas}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catStretchMid}`),
    Assets.load<Texture>(`${baseUrl}${curtainArt.image}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catTurnAtlas}`),
    Assets.load<Texture>(`${baseUrl}${fanArt.image}`),
    Assets.load<Texture>(`${baseUrl}${residentArt.image}`),
    Assets.load<Texture>(`${baseUrl}${steamArt.image}`),
    Assets.load<Texture>(`${baseUrl}${meteorArt.image}`),
    Assets.load<Texture>(`${baseUrl}${laundryArt.image}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catLookAtlas}`),
    Assets.load<Texture>(`${baseUrl}${plantArt.image}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.alternateTrain}`),
    Assets.load<Texture>(`${baseUrl}${generatedArt.catRiseAtlas}`),
  ]);
  const wideBackground = createLogicalBackground(loadedWideBackground,
    generatedArt.wide.width, generatedArt.wide.height, generatedArt.wide.resolution);
  background.source.scaleMode = 'nearest';
  wideBackground.source.scaleMode = 'nearest';
  portraitBackground.source.scaleMode = 'nearest';
  atlas.source.scaleMode = 'nearest';
  alternateTrain.source.scaleMode = 'nearest';
  restAtlas.source.scaleMode = 'nearest';
  for (const image of [walkAtlas, back, lift, groomAtlas, settleAtlas, stretchAtlas, stretchMid, turnAtlas, lookAtlas, riseAtlas]) image.source.scaleMode = 'nearest';
  const imageStreetCar = createImageStreetCar(streetCar, [background, wideBackground, portraitBackground]);
  const imageCurtain = createImageCurtain(curtainAtlas);
  const imageFan = createImageFan(fanAtlas, [background, portraitBackground]);
  let fan: ReturnType<typeof imageFan.createSprite> | undefined;
  let curtain: Sprite | undefined;
  const imageResident = createImageResident(residentAtlas);
  let resident: Sprite | undefined;
  const imageSteam = createImageSteam(steamAtlas);
  let steam: Sprite | undefined;
  const imageMeteor = createImageMeteor(meteorAtlas);
  let meteor: Sprite;
  let meteorSkyBottom = 0;
  const imageLaundry = createImageLaundry(laundryAtlas);
  let laundry: ReturnType<typeof imageLaundry.createSprite> | undefined;
  let residentComposition: 0 | 1 = 0;
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
  const imageUpperCloud = createImageUpperCloud(frames.cloud);
  const imageRoomLights = createImageRoomLights([background, wideBackground, portraitBackground]);
  const imageStars = createImageStars([background, wideBackground, portraitBackground]);
  let stars: ReturnType<typeof imageStars.createSprite>;
  const imageSkylineLights = createImageSkylineLights([background, wideBackground, portraitBackground]);
  let skylineLights: ReturnType<typeof imageSkylineLights.createSprite>;
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
  const imageCat = createImageCat(atlas, restAtlas, walkAtlas, back, lift, groomAtlas, settleAtlas,
    stretchAtlas, stretchMid, turnAtlas, { atlas: lookAtlas, renderer: app.renderer }, { atlas: riseAtlas, renderer: app.renderer });
  const imagePlant = createImagePlant(plantAtlas, app.renderer);
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
  let motionScale = 1;
  let originX = 0;
  let originY = 0;
  let catY = 470;
  let actorScale = 1;
  let trains: { art: Sprite; offset: number }[] = [];
  let mirroredBackground: ReturnType<typeof createImageWideBackground> | undefined;
  let sampledPoles: ReturnType<typeof createImageRailPoles> | undefined;
  let trainInitialX = 0;
  let aircraft: Sprite;
  let oppositeAircraft: Sprite | undefined;
  let cloud: Sprite;
  let upperCloud: Sprite;
  let cat: Sprite;
  let plant: Sprite;
  let windows: Container[] = [];
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
    sampledPoles?.destroy();
    sampledPoles = undefined;
    mirroredBackground?.destroy();
    mirroredBackground = undefined;
    const layout = generatedLayout(width, height);
    const composition = layout.composition;
    const textures = compositionTextures[layout.portrait ? 2 : layout.wide ? 1 : 0];
    scale = layout.scale;
    motionScale = layout.motionScale;
    actorScale = composition.actorScale;
    originX = layout.originX;
    originY = layout.originY;
    if (layout.wide) {
      mirroredBackground = createImageWideBackground(textures.background, width, height, scale, originX, originY);
      app.stage.addChild(mirroredBackground.root);
    } else {
      // Existing non-wide edge crops retain their original sampling and appearance.
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
    }
    skylineLights = imageSkylineLights.createSprite(layout.portrait ? 2 : layout.wide ? 1 : 0, scale, originX, originY);
    app.stage.addChild(skylineLights.root);
    stars = imageStars.createSprite(layout.portrait ? 2 : layout.wide ? 1 : 0, scale, originX, originY);
    app.stage.addChild(stars.root);
    fan = undefined;
    if (!layout.wide) {
      fan = imageFan.createSprite(layout.portrait ? 1 : 0, scale, originX, originY);
      app.stage.addChild(fan.root);
    }
    laundry = undefined;
    if (!layout.wide) {
      laundry = imageLaundry.createSprite(layout.portrait ? 1 : 0, scale, originX, originY);
      app.stage.addChild(laundry.root);
    }
    curtain = undefined;
    resident = undefined;
    residentComposition = layout.portrait ? 1 : 0;
    windows = composition.windows.map(([x, y, w, h], index) => {
      // Residents and curtains are beneath the existing dark overlay and inherit its light cycle.
      if (!layout.wide && index === residentArt.placements[residentComposition].window) {
        resident = imageResident.createSprite([x, y, w, h], residentComposition, scale, originX, originY);
        app.stage.addChild(resident);
      }
      if (!layout.wide && index === (layout.portrait ? curtainArt.portraitWindow : curtainArt.normalWindow)) {
        curtain = imageCurtain.createSprite([x, y, w, h], scale, originX, originY);
        app.stage.addChild(curtain);
      }
      const art = imageRoomLights.createCover(layout.portrait ? 2 : layout.wide ? 1 : 0,
        index, [x, y, w, h], textures.darkWall, scale, originX, originY);
      app.stage.addChild(art);
      return art;
    });
    roadCar = imageStreetCar.createSprite(layout.portrait ? 2 : layout.wide ? 1 : 0, scale, originX, originY);
    app.stage.addChild(roadCar.root);
    meteorSkyBottom = layout.skyBottom;
    meteor = imageMeteor.createSprite(width, meteorSkyBottom);
    app.stage.addChild(meteor);
    upperCloud = imageUpperCloud.createSprite(layout);
    app.stage.addChild(upperCloud);
    cloud = sprite(frames.cloud);
    cloud.scale.set(layout.cloudScale);
    cloud.y = layout.cloudY;
    cloud.alpha = 0.35;
    aircraft = sprite(frames.aircraft);
    aircraft.scale.set(layout.aircraftScale);
    aircraft.y = layout.aircraftY;
    oppositeAircraft = undefined;
    const oppositeFlight = oppositeAircraftGeometry(width, layout);
    if (oppositeFlight.visible) {
      oppositeAircraft = sprite(frames.aircraft);
      // Negative scale with a right-edge anchor keeps x at the mirrored image's left bound.
      oppositeAircraft.anchor.set(1, 0);
      oppositeAircraft.scale.set(-oppositeFlight.scale, oppositeFlight.scale);
      oppositeAircraft.y = oppositeFlight.y;
    }
    const train = sprite(frames.train);
    train.scale.set(motionScale * 0.24 * actorScale);
    train.y = layout.railBottom - train.height;
    trains = trainServiceOffsets(width, train.width).map((offset, index) => {
      const art = index === 0 ? train : sprite(alternateTrain);
      art.scale.copyFrom(train.scale);
      art.y = train.y;
      return { art, offset };
    });
    trainInitialX = width * 0.1;
    let nearestPoleDistance = Infinity;
    // Wide poles share whole-background sampling even when individual source pixels are discarded.
    if (layout.wide) sampledPoles = createImageRailPoles(app.renderer, textures.background,
      composition.railPoles, scale, originX, originY, width, height);
    const poles = sampledPoles?.poles ?? textures.railPoles.map(({ texture, frame }) => {
      const art = new Sprite(texture);
      art.roundPixels = true;
      art.position.set(sourceX(frame[0]), sourceY(frame[1]));
      art.scale.set(scale);
      return { art, frame };
    });
    for (const { art: pole, frame: [x, y, w, h] } of poles) {
      app.stage.addChild(pole);
      if (sourceX(x + w) <= 0 || sourceX(x) >= width || sourceY(y + h) <= 0 || sourceY(y) >= height) continue;
      const center = sourceX(x + w / 2);
      const distance = Math.abs(center - width * 0.25);
      if (distance < nearestPoleDistance) {
        nearestPoleDistance = distance;
        trainInitialX = center - train.width / 2;
      }
    }
    steam = undefined;
    if (!layout.wide) {
      steam = imageSteam.createSprite(layout.portrait ? 1 : 0, scale, originX, originY);
      app.stage.addChild(steam);
    }
    plant = imagePlant.createSprite(plantGeometry(layout, width, height));
    app.stage.addChild(plant);
    cat = imageCat.createSprite();
    app.stage.addChild(cat);
    catY = layout.catY;
    animate();
    app.renderer.render(app.stage);
  }

  function animate() {
    imagePlant.update(plant, elapsed);
    imageSkylineLights.update(skylineLights, elapsed);
    imageStreetCar.update(roadCar, elapsed);
    imageMeteor.update(meteor, elapsed, width, meteorSkyBottom);
    if (steam) imageSteam.update(steam, elapsed);
    if (laundry) imageLaundry.update(laundry, elapsed);
    if (curtain) imageCurtain.update(curtain, elapsed);
    if (fan) imageFan.update(fan, elapsed);
    if (resident) imageResident.update(resident, elapsed, residentComposition);
    imageStars.update(stars, elapsed);
    windows.forEach((art, index) => {
      const cycle = residentialLightCycle(index);
      const brightness = windowBrightness(elapsed, cycle.phase, cycle.period);
      art.alpha = 0.92 * (1 - brightness);
      if (resident && index === residentArt.placements[residentComposition].window) resident.alpha = brightness;
    });
    imageUpperCloud.update(upperCloud, elapsed, width, motionScale);
    cloud.x = travelPosition(elapsed, width, cloud.width, motionScale * cityMotion.cloudSpeed, width * 0.12);
    aircraft.x = travelPosition(elapsed, width, aircraft.width, motionScale * cityMotion.aircraftSpeed, width * 0.7);
    if (oppositeAircraft) oppositeAircraft.x = travelPosition(elapsed, width, oppositeAircraft.width,
      -motionScale * cityMotion.aircraftSpeed, width * oppositeAircraftArt.initialFraction);
    for (const { art, offset } of trains) {
      art.x = travelPosition(elapsed, width, art.width, motionScale * 16, trainInitialX + offset);
    }
    const pose = catPose(elapsed, width, motionScale * actorScale);
    imageCat.update(cat, pose, motionScale * actorScale, catY);
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
      sampledPoles?.destroy();
      mirroredBackground?.destroy();
      for (const texture of crops) texture.destroy(false);
      wideBackground.destroy(false);
      imageCat.destroy();
      imagePlant.destroy();
      imageStreetCar.destroy();
      imageCurtain.destroy();
      imageFan.destroy();
      imageResident.destroy();
      imageSteam.destroy();
      imageMeteor.destroy();
      imageLaundry.destroy();
      imageSkylineLights.destroy();
      imageStars.destroy();
      imageRoomLights.destroy();
      // Assets owns the shared image sources; sprite/crop disposal must not destroy them.
    },
  };
}
