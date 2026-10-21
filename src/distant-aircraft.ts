import { Container, Graphics } from 'pixi.js';

/** A small swept-wing airliner, drawn on the finer half-unit grid. */
export function createDistantAircraft(): { art: Container; navigationLight: Graphics } {
  const art = new Container();
  const aircraft = new Graphics();
  const rect = (x: number, y: number, width: number, height: number, color: number) => {
    aircraft.rect(x, y, width, height).fill(color);
  };
  // Half-unit steps taper backward from each wing root instead of forming a thick cross.
  const wingRows = [
    [-1, -1, 3.5], [-1.5, -1.5, 3], [-2, -2, 2.5], [-2.5, -2.5, 2],
    [-3, -3, 1.5], [-3.5, -3.5, 1], [-4, -3.5, 0.5],
  ];
  const tailRows = [[-1, -6.5, 1.5], [-1.5, -7, 1.5], [-2, -7.5, 1.5], [-2.5, -7.5, 0.5]];
  for (const [y, x, width] of [...wingRows, ...tailRows]) {
    rect(x, y, width, 0.5, 0xa69aaf);
    rect(x, -y - 0.5, width, 0.5, 0x8f879f);
  }
  // The brighter upper fuselage and shaded underside keep the nose legible at a distance.
  rect(-7, -0.5, 0.5, 1, 0x8f859d);
  rect(-6.5, -0.5, 13.5, 1, 0xc7b8c2);
  rect(-5.5, -1, 11.5, 0.5, 0xd3c4ca);
  rect(-5.5, 0.5, 12.5, 0.5, 0x8f859d);
  rect(7, 0, 0.5, 0.5, 0xe4cfae);
  rect(5.5, -0.5, 1, 0.5, 0x77738a);
  const navigationLight = new Graphics()
    .rect(-3.5, -4, 0.5, 0.5).fill(0xb9757d)
    .rect(-3.5, 3.5, 0.5, 0.5).fill(0x9fb5ae);
  art.addChild(aircraft, navigationLight);
  return { art, navigationLight };
}
