import { Container, Graphics } from 'pixi.js';

/** Small foreground details share the scene clock, so pausing also pauses the night breeze. */
export function createRooftopBreeze({ cupX, cupY, plantX }: {
  cupX: number;
  cupY: number;
  plantX: number;
}): { art: Container; update(seconds: number): void } {
  const art = new Container();
  const wisps = Array.from({ length: 3 }, (_, index) => {
    const pixels = new Graphics()
      .rect(0, 0, 1, 2)
      .rect(1, -2, 1, 2)
      .rect(0, -3, 1, 1)
      .fill(0xcbbfc8);
    art.addChild(pixels);
    return { pixels, phase: index * 8 / 3 + 0.4 };
  });
  const anchors = new Graphics();
  art.addChild(anchors);
  const leaves = Array.from({ length: 7 }, (_, index) => {
    const right = index % 2 === 1;
    const y = 324 + index * 3;
    const color = right ? 0x4a5c5c : 0x384b50;
    // Fixed inner sections overlap the moving tips, keeping every leaf joined to the stem.
    anchors.rect(plantX + (right ? 3 : -2), y, 3, 3).fill(color);
    const tip = new Graphics().rect(plantX + (right ? 5 : -6), y, 5, 3).fill(color);
    art.addChild(tip);
    return { tip, strength: 1 - index / 12 };
  });

  function update(seconds: number) {
    const wind = Math.sin(seconds * 0.24);
    for (const { pixels, phase } of wisps) {
      const age = ((seconds + phase) % 8 + 8) % 8;
      const rise = Math.min(age / 6.5, 1);
      pixels.x = Math.round(cupX + wind * (0.5 + rise));
      pixels.y = Math.round(cupY - 2 - rise * 6);
      pixels.alpha = age < 6.5 ? Math.sin(rise * Math.PI) * 0.38 : 0;
    }
    for (const { tip, strength } of leaves) tip.y = Math.round(wind * strength);
  }

  update(0);
  return { art, update };
}
