import { Container, Graphics } from 'pixi.js';

/** The housing and grille stay still while a dim rotor turns behind them. */
export function createRooftopFan(): { art: Container; update(seconds: number): void } {
  const art = new Container();
  art.position.set(56, 343);
  const housing = new Graphics()
    .rect(0, 2, 29, 20).fill(0x4d485c)
    .rect(0, 0, 29, 3).fill(0x72616d)
    .rect(3, 5, 18, 13).fill(0x252c40)
    .rect(23, 6, 3, 3).fill(0x8c7a81);
  art.addChild(housing);
  // Build the rotor on the scene's finer half-unit grid; only visibility changes at runtime.
  const frames = Array.from({ length: 6 }, (_, frame) => {
    const pixels = new Graphics();
    for (let blade = 0; blade < 3; blade++) {
      const angle = blade * Math.PI * 2 / 3 + frame * Math.PI / 9;
      for (let radius = 1.5; radius <= 5; radius += 0.5) {
        // A narrow root widens slightly toward the tip, rather than becoming a bright cross.
        const halfWidth = radius < 3 ? 0 : 0.5;
        for (let edge = -halfWidth; edge <= halfWidth; edge += 0.5) {
          const x = 12 + Math.round((Math.cos(angle) * radius - Math.sin(angle) * edge) * 2) / 2;
          const y = 11 + Math.round((Math.sin(angle) * radius + Math.cos(angle) * edge) * 2) / 2;
          pixels.rect(x, y, 0.5, 0.5);
        }
      }
    }
    pixels.fill(0x404356);
    pixels.visible = frame === 0;
    art.addChild(pixels);
    return pixels;
  });
  const grille = new Graphics().rect(12, 11, 1, 1).fill(0x5b586c);
  for (let y = 7; y < 18; y += 3) grille.rect(5, y, 14, 1).fill(0x565268);
  art.addChild(grille);
  return {
    art,
    update(seconds) {
      const frame = Math.floor(seconds / 0.35) % frames.length;
      frames.forEach((pixels, index) => { pixels.visible = index === frame; });
    },
  };
}
