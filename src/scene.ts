import { Application, Container, Graphics } from 'pixi.js';
import { catPose, travelPosition, windowBrightness } from './animation';
import { createRooftopBreeze } from './rooftop-breeze';
import { createRooftopCat } from './rooftop-cat';
import { createWindowLife } from './window-life';
import { residentialHouses, streetGap } from './residential-layout';
import { createDistantTaxi } from './distant-taxi';
import { createAlleyVendingMachine } from './alley-vending-machine';

/** Draw at a deliberately small resolution: every visible edge stays on the pixel grid. */
export async function createScene(host: HTMLElement): Promise<{
  setMotion(enabled: boolean): void;
  destroy(): void;
}> {
  const app = new Application();
  await app.init({ width: 640, height: 400, antialias: false, resolution: 1, background: '#101326', preference: 'webgl', autoStart: false });
  const canvas = app.canvas;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '星空の下、屋上から眺める東京。電車が街を走り、飛行機が空を渡り、野良猫が屋上を歩き、毛づくろいをして丸くなります。ときどき路地をタクシーが通り、暖かな窓の灯りが点いたり消えたりしています。');
  canvas.style.cssText = 'display:block;width:100%;height:100%;image-rendering:pixelated;';
  host.append(canvas);
  app.ticker.maxFPS = 20;
  let motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed = 0;
  let width = 640;
  let height = 400;
  let stars: { art: Graphics; phase: number }[] = [];
  let clouds: { art: Container; initialX: number; speed: number }[] = [];
  let lights: { x: number; y: number; art: Container; phase: number; period: number }[] = [];
  let windowLife: ReturnType<typeof createWindowLife>;
  let train: Container;
  let airplane: Container;
  let navigationLight: Graphics;
  let cat: ReturnType<typeof createRooftopCat>;
  let rooftopBreeze: ReturnType<typeof createRooftopBreeze>;
  let taxi: ReturnType<typeof createDistantTaxi> | undefined;

  function build() {
    const bounds = host.getBoundingClientRect();
    const aspect = Math.max(0.35, Math.min(3.2, (bounds.width || 1280) / (bounds.height || 800)));
    height = 400;
    width = Math.round(height * aspect);
    app.renderer.resize(width, height);
    const previous = app.stage.removeChildren();
    previous.forEach((child) => child.destroy({ children: true }));
    stars = [];
    clouds = [];
    lights = [];
    let seed = 74021;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const rect = (g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) => {
      g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).fill({ color, alpha });
    };
    const background = new Graphics();
    app.stage.addChild(background);
    const blend = (a: number, b: number, amount: number) => {
      const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
      return (channel(16) << 16) | (channel(8) << 8) | channel(0);
    };
    for (let y = 0; y < 310; y += 2) rect(background, 0, y, width, 2, blend(0x0c1128, 0x54405d, (y / 310) ** 1.6));
    // A restrained crescent and scattered stars leave plenty of quiet sky.
    const moonX = Math.round(width * 0.72);
    background.poly([moonX, 45, moonX + 8, 45, moonX + 8, 47, moonX + 12, 47, moonX + 12, 51, moonX + 14, 51, moonX + 14, 59, moonX + 12, 59, moonX + 12, 63, moonX + 8, 63, moonX + 8, 65, moonX, 65, moonX, 63, moonX - 4, 63, moonX - 4, 59, moonX - 6, 59, moonX - 6, 51, moonX - 4, 51, moonX - 4, 47, moonX, 47]).fill(0xe0d7c3);
    rect(background, moonX + 5, 45, 5, 2, 0x14182f);
    rect(background, moonX + 8, 47, 5, 4, 0x14182f);
    rect(background, moonX + 10, 51, 5, 8, 0x14182f);
    for (let i = 0; i < width / 5; i++) {
      const x = Math.floor(random() * width);
      const y = Math.floor(12 + random() * 155);
      const art = new Graphics();
      rect(art, x, y, 1, 1, i % 7 === 0 ? 0xd8d6e0 : 0x9393b2);
      if (i % 18 === 0) {
        rect(art, x - 1, y, 3, 1, 0xa8a4c2, 0.7);
        rect(art, x, y - 1, 1, 3, 0xa8a4c2, 0.7);
      }
      art.alpha = 0.3 + random() * 0.6;
      stars.push({ art, phase: random() * Math.PI * 2 });
      app.stage.addChild(art);
    }
    for (let i = 0; i < 5; i++) {
      const art = new Container();
      const cloud = new Graphics();
      const cloudWidth = 45 + random() * 95;
      rect(cloud, 0, 8, cloudWidth, 3, 0x6b5b80, 0.12);
      rect(cloud, 9, 4, cloudWidth * 0.7, 5, 0x6b5b80, 0.12);
      rect(cloud, 25, 1, cloudWidth * 0.3, 4, 0x6b5b80, 0.1);
      art.addChild(cloud);
      art.x = random() * width;
      art.y = 90 + i * 21;
      clouds.push({ art, initialX: art.x, speed: 0.35 + random() * 0.3 });
      app.stage.addChild(art);
    }
    // One thin, sky-colored wisp gently veils the moon without turning the clear night overcast.
    const moonCloud = new Container();
    const veil = new Graphics();
    rect(veil, 16, 0, 56, 2, 0x12152c, 0.025);
    rect(veil, 6, 2, 70, 2, 0x12152c, 0.04);
    rect(veil, 0, 4, 88, 2, 0x12152c, 0.06);
    rect(veil, 9, 6, 74, 2, 0x12152c, 0.045);
    rect(veil, 24, 8, 48, 2, 0x12152c, 0.02);
    moonCloud.addChild(veil);
    moonCloud.x = moonX - 100;
    moonCloud.y = 48;
    clouds.push({ art: moonCloud, initialX: moonCloud.x, speed: 0.55 });
    app.stage.addChild(moonCloud);
    // A distant aircraft crosses well above the skyline, with restrained navigation lights.
    airplane = new Container();
    const aircraft = new Graphics();
    rect(aircraft, -7, 0, 14, 2, 0xb3a4b5);
    rect(aircraft, -4, -1, 7, 4, 0xc7b8c2);
    rect(aircraft, -1, -4, 2, 9, 0x9a91aa);
    rect(aircraft, -6, -2, 2, 6, 0x8c819b);
    rect(aircraft, 6, 0, 2, 1, 0xe4cfae);
    navigationLight = new Graphics();
    rect(navigationLight, 0, -4, 1, 1, 0xb9757d);
    rect(navigationLight, 0, 4, 1, 1, 0x9fb5ae);
    airplane.addChild(aircraft, navigationLight);
    airplane.y = 105;
    app.stage.addChild(airplane);
    let city = new Graphics();
    app.stage.addChild(city);
    // Haze and distant high-rises. Silhouettes become darker and more detailed toward the viewer.
    rect(city, 0, 242, width, 75, 0x51405c);
    for (let layer = 0; layer < 3; layer++) {
      let x = -10;
      const bottom = 272 + layer * 19;
      const facade = [0x3c3552, 0x2c2b47, 0x23283e][layer];
      while (x < width) {
        const bw = 13 + Math.floor(random() * (layer === 0 ? 22 : 31));
        const bh = 15 + Math.floor(random() * (layer === 0 ? 65 : 43));
        const top = bottom - bh;
        rect(city, x, top, bw, bh, facade);
        rect(city, x + 2, top - 2, bw - 4, 2, facade);
        if (layer === 0 && bh > 58) {
          rect(city, x + bw / 2, top - 9, 1, 8, 0x4c405c);
          rect(city, x + bw / 2, top - 9, 1, 1, 0xc97b82);
        }
        for (let wy = top + 5; wy < bottom - 3; wy += 6) {
          for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
            const lit = random();
            if (lit > 0.55) rect(city, wx, wy, layer === 0 ? 1 : 2, 2, lit > 0.86 ? 0xbda089 : 0x68617d, layer === 0 ? 0.5 : 0.7);
          }
        }
        x += bw + 2 + Math.floor(random() * 4);
      }
    }
    // An elevated railway sits behind the nearby homes, in front of the distant city.
    const viaduct = new Graphics();
    rect(viaduct, 0, 273, width, 5, 0x454159);
    rect(viaduct, 0, 272, width, 1, 0x8b7481);
    rect(viaduct, 0, 278, width, 2, 0x1d2438);
    for (let x = 18; x < width; x += 62) rect(viaduct, x, 280, 5, 28, 0x38364e);
    app.stage.addChild(viaduct);
    train = new Container();
    const carriages = new Graphics();
    for (let car = 0; car < 4; car++) {
      const x = car * 29;
      rect(carriages, x, 1, 27, 9, 0xafa1aa);
      rect(carriages, x + 2, 0, 23, 1, 0xc0b1b7);
      rect(carriages, x, 7, 27, 2, 0x978094);
      for (let window = 3; window < 24; window += 6) {
        rect(carriages, x + window, 3, 4, 3, 0xe6ba8b);
        rect(carriages, x + window, 3, 4, 1, 0xf0cfa0);
      }
      rect(carriages, x + 3, 10, 4, 1, 0x171e30);
      rect(carriages, x + 20, 10, 4, 1, 0x171e30);
      if (car < 3) rect(carriages, x + 27, 5, 2, 3, 0x65556e);
    }
    rect(carriages, 114, 4, 2, 2, 0xe9d5ac);
    rect(carriages, 0, 4, 1, 2, 0xb67581);
    train.addChild(carriages);
    train.y = 261;
    app.stage.addChild(train);
    const houses = residentialHouses(width, random);
    const alley = streetGap(houses, width);
    taxi = alley ? createDistantTaxi({ left: alley.left, width: alley.width, y: 329 }) : undefined;
    if (taxi) app.stage.addChild(taxi.art);
    // Residential facades occlude the taxi, train and support columns.
    city = new Graphics();
    app.stage.addChild(city);
    const roomLights = new Container();
    app.stage.addChild(roomLights);
    // Open one street view without moving the neighboring houses or regenerating their rooms.
    houses.forEach((house, index) => {
      const trimStart = alley?.after === index - 1 ? alley.rightTrim : 0;
      const trimEnd = alley?.after === index ? alley.leftTrim : 0;
      const houseX = house.x + trimStart;
      const bw = house.width - trimStart - trimEnd;
      const top = house.top;
      rect(city, houseX, top, bw, 64, house.body);
      rect(city, houseX + bw - 6, top, 6, 64, 0x1c2033);
      rect(city, houseX - 2, top - 3, bw + 4, 3, 0x171e32);
      rect(city, houseX, top - 4, bw, 1, 0x646071);
      rect(city, houseX + 7, top - 11, 12, 7, 0x343148);
      rect(city, houseX + 9, top - 12, 9, 1, 0x6e5d70);
      if (house.antenna) {
        rect(city, houseX + bw - 13, top - 22, 1, 19, 0x181e31);
        rect(city, houseX + bw - 21, top - 19, 17, 1, 0x181e31);
        rect(city, houseX + bw - 18, top - 22, 1, 6, 0x181e31);
        rect(city, houseX + bw - 8, top - 22, 1, 6, 0x181e31);
      }
      for (const { x, y, light: illumination } of house.rooms) {
        if (x - 2 < houseX || x + 10 > houseX + bw) continue;
        rect(city, x - 1, y - 1, 10, 9, 0x131c30);
        rect(city, x, y, 8, 7, 0x30364d);
        if (illumination) {
          const light = new Graphics();
          rect(light, x, y, 8, 7, 0xbb8c71);
          rect(light, x, y, 8, 2, 0xe3b48a);
          const frame = new Graphics();
          rect(frame, x + 3, y, 1, 7, 0x5a4d56);
          const room = new Container();
          room.addChild(light, frame);
          lights.push({ x, y, art: room, ...illumination });
          roomLights.addChild(room);
        }
        rect(city, x - 2, y + 8, 12, 2, 0x171d30);
      }
    });
    windowLife = createWindowLife(lights.filter(({ x }) => x >= 0 && x + 8 <= width));
    const vendingMachine = createAlleyVendingMachine({ alley, viewportWidth: width });
    if (vendingMachine) app.stage.addChild(vendingMachine);
    const foreground = new Graphics();
    app.stage.addChild(foreground);
    // The foreground is a quiet place to sit, rather than another interface.
    rect(foreground, 0, 343, width, 57, 0x171e30);
    for (let y = 353; y < height; y += 14) {
      rect(foreground, 0, y, width, 1, 0x23283b);
      for (let x = -30 + ((y / 14) % 2) * 31; x < width; x += 62) rect(foreground, x, y, 1, 14, 0x23283b);
    }
    rect(foreground, 0, 337, width, 7, 0x343348);
    rect(foreground, 0, 336, width, 2, 0x7a6875);
    rect(foreground, 0, 344, width, 2, 0x101a2a);
    // Slender safety railing above the parapet.
    for (let x = 12; x < width; x += 57) {
      rect(foreground, x, 304, 2, 32, 0x151e30);
      rect(foreground, x, 304, 1, 31, 0x5b536a);
    }
    rect(foreground, 0, 303, width, 2, 0x1a2135);
    rect(foreground, 0, 302, width, 1, 0x777080);
    rect(foreground, 0, 320, width, 1, 0x272a40);
    // A warm doorway at the left, with a pool of light on the roof.
    rect(foreground, 0, 236, 44, 109, 0x20253a);
    rect(foreground, 0, 233, 47, 4, 0x444055);
    rect(foreground, 7, 258, 25, 77, 0x121c2d);
    rect(foreground, 10, 261, 19, 71, 0x554752);
    rect(foreground, 13, 265, 13, 22, 0xcba17d);
    rect(foreground, 13, 272, 13, 1, 0x806773);
    rect(foreground, 19, 265, 1, 22, 0x806773);
    rect(foreground, 24, 303, 2, 2, 0xc3a588);
    foreground.poly([9, 344, 32, 344, 75, 385, 0, 385]).fill({ color: 0xc09170, alpha: 0.06 });
    // Folding chair and tiny table frame the city without obscuring it.
    const chairX = Math.round(width * 0.68);
    foreground.poly([chairX, 326, chairX + 20, 326, chairX + 26, 349, chairX + 5, 349]).fill(0x74616e);
    foreground.poly([chairX + 3, 330, chairX + 17, 330, chairX + 21, 345, chairX + 7, 345]).fill(0x4e4a62);
    rect(foreground, chairX + 3, 349, 27, 4, 0x8c7380);
    foreground.poly([chairX + 5, 353, chairX + 8, 353, chairX + 27, 378, chairX + 25, 378]).fill(0x777080);
    foreground.poly([chairX + 25, 353, chairX + 28, 353, chairX + 6, 378, chairX + 4, 378]).fill(0x777080);
    const tableX = chairX - 30;
    rect(foreground, tableX, 350, 21, 3, 0x8a7380);
    rect(foreground, tableX + 3, 353, 2, 20, 0x56516a);
    rect(foreground, tableX + 17, 353, 2, 20, 0x56516a);
    rect(foreground, tableX + 8, 344, 5, 6, 0xc3a18e);
    rect(foreground, tableX + 13, 345, 2, 3, 0x9b7f79);
    // Plants, utility pipes and a rooftop ventilation unit add a lived-in scale.
    const plantX = width - 24;
    rect(foreground, plantX - 4, 350, 12, 14, 0x5b4050);
    rect(foreground, plantX - 6, 348, 16, 3, 0x8c6370);
    rect(foreground, plantX + 1, 322, 2, 27, 0x3e5255);
    rect(foreground, 56, 345, 29, 20, 0x4d485c);
    rect(foreground, 56, 343, 29, 3, 0x72616d);
    rect(foreground, 59, 348, 18, 13, 0x252c40);
    for (let y = 350; y < 361; y += 3) rect(foreground, 61, y, 14, 1, 0x565268);
    rect(foreground, 79, 349, 3, 3, 0x8c7a81);
    rooftopBreeze = createRooftopBreeze({ cupX: tableX + 10, cupY: 344, plantX });
    app.stage.addChild(rooftopBreeze.art);
    cat = createRooftopCat();
    cat.art.y = 383;
    app.stage.addChild(cat.art);
    animate();
    app.renderer.render(app.stage);
  }

  function animate() {
    rooftopBreeze.update(elapsed);
    windowLife.update(elapsed);
    taxi?.update(elapsed);
    for (const { art, phase } of stars) art.alpha = 0.45 + Math.sin(elapsed * 0.24 + phase) * 0.25;
    for (const { art, initialX, speed } of clouds) art.x = Math.round(((initialX + elapsed * speed + 160) % (width + 180)) - 160);
    for (const { art, phase, period } of lights) art.alpha = windowBrightness(elapsed, phase, period);
    train.x = travelPosition(elapsed, width, 116, 10, width * 0.12);
    airplane.x = travelPosition(elapsed, width + 8, 18, 3.8, width * 0.42);
    navigationLight.alpha = 0.45 + (Math.cos(elapsed * Math.PI / 2) + 1) * 0.275;
    cat.update(catPose(elapsed, width));
  }
  app.ticker.add((ticker) => {
    elapsed += ticker.deltaMS / 1000;
    animate();
  });
  const updateActivity = () => {
    const running = motion && !document.hidden;
    canvas.dataset.motion = running ? 'running' : 'paused';
    if (running) app.start();
    else app.stop();
  };
  const observer = new ResizeObserver(() => {
    build();
    updateActivity();
  });
  build();
  observer.observe(host);
  document.addEventListener('visibilitychange', updateActivity);
  updateActivity();
  return {
    setMotion(enabled) { motion = enabled; updateActivity(); },
    destroy() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateActivity);
      app.destroy(true, { children: true });
    },
  };
}
