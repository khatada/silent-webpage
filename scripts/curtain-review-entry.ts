import { Application, Container, Graphics } from 'pixi.js';
import { createWindowCurtains } from '../src/window-curtains';
import { curtainedWindows, curtainOffset } from '../src/window-timing';

/** Show the actual curtain renderer behind representative lit glass and its fixed frame. */
export async function renderCurtainReview() {
  const app = new Application();
  await app.init({ width: 360, height: 120, resolution: 1, antialias: false,
    background: 0x171e30, preference: 'webgl', autoStart: false });
  document.body.append(app.canvas);
  const samples = [17, 0, 4].map((seconds, index) => {
    const rooms = Array.from({ length: 10 }, (_, roomIndex) => {
      const x = roomIndex * 16;
      const y = 0;
      const art = new Container();
      const glass = new Graphics().rect(x, y, 8, 7).fill(0xbb8c71)
        .rect(x, y, 8, 2).fill(0xe3b48a);
      const frame = new Graphics().rect(x + 3.5, y, 0.5, 7).fill(0x5a4d56)
        .rect(x, y + 3.5, 8, 0.5).fill(0x5a4d56)
        .rect(x + 0.5, y + 0.5, 0.5, 6).fill({ color: 0xf1cba0, alpha: 0.5 });
      art.addChild(glass, frame);
      return { x, y, art };
    });
    const curtains = createWindowCurtains(rooms);
    curtains.update(seconds);
    const room = curtainedWindows(rooms)[0];
    if (!room) throw new Error('Review fixture has no curtained room.');
    const x = 28 + index * 120;
    app.stage.addChild(new Graphics().rect(x - 8, 32, 80, 72).fill(0x131c30));
    room.art.scale.set(8);
    room.art.position.set(x - room.x * 8, 40 - room.y * 8);
    app.stage.addChild(room.art);
    return { seconds, offset: curtainOffset(seconds), selectedWindow: { x: room.x, y: room.y } };
  });
  app.renderer.render(app.stage);
  app.canvas.dataset.ready = 'true';
  return { width: 360, height: 120, displayScale: 8, samples,
    context: 'Representative lit glass and frame; curtain artwork and selection use the actual modules.' };
}
