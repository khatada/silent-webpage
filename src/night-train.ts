import { Container, Graphics } from 'pixi.js';

/** A four-car night train with a few quiet silhouettes behind its warm windows. */
export function createNightTrain(): Container {
  const train = new Container();
  const carriages = new Graphics();
  const rect = (x: number, y: number, width: number, height: number, color: number) => {
    carriages.rect(x, y, width, height).fill(color);
  };
  for (let car = 0; car < 4; car++) {
    const x = car * 29;
    rect(x, 1, 27, 9, 0xafa1aa);
    rect(x + 2, 0, 23, 1, 0xc0b1b7);
    rect(x, 7, 27, 2, 0x978094);
    rect(x + 0.5, 1.5, 26, 0.5, 0xd1bec6);
    rect(x + 0.5, 9.5, 26, 0.5, 0x776c80);
    for (let window = 0; window < 4; window++) {
      const windowX = x + 3 + window * 6;
      rect(windowX, 3, 4, 3, 0xe6ba8b);
      if ((window + car) % 2 === 0) {
        // Two face-free passengers per car, contained below the bright upper glass.
        const shift = window % 2 === 0 ? 0 : 0.5;
        rect(windowX + 1.5 + shift, 4, 0.5, 0.5, 0xa88d7e);
        rect(windowX + 1 + shift, 4.5, 1.5, 1, 0xa88d7e);
      }
      rect(windowX, 3, 4, 1, 0xf0cfa0);
      // Outer edges and the sill leave the existing luminous glass area intact.
      rect(windowX - 0.5, 3, 0.5, 3, 0x8f7e86);
      rect(windowX + 4, 3, 0.5, 3, 0x8f7e86);
      rect(windowX - 0.5, 6, 5, 0.5, 0x8f7e86);
    }
    // Fixed door frames sit in front of the interior, including the end-door window.
    for (const door of [1, 24]) {
      rect(x + door, 3, 0.5, 5, 0x796b80);
      rect(x + door + 1, 3, 0.5, 5, 0x796b80);
    }
    rect(x + 3, 10, 4, 1, 0x171e30);
    rect(x + 20, 10, 4, 1, 0x171e30);
    if (car < 3) rect(x + 27, 5, 2, 3, 0x65556e);
  }
  rect(114, 4, 2, 2, 0xe9d5ac);
  rect(0, 4, 1, 2, 0xb67581);
  train.addChild(carriages);
  return train;
}
