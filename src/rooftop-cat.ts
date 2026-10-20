import { Container, Graphics } from 'pixi.js';
import type { CatPose } from './animation';

/** Reuse nine pixel silhouettes; posture changes do not allocate drawing commands each frame. */
export function createRooftopCat(): { art: Container; update(pose: CatPose): void } {
  const art = new Container();
  const shadow = new Graphics()
    .rect(-9, 0, 18, 1).rect(-6, 1, 12, 1).fill({ color: 0x080e1c, alpha: 0.35 });
  art.addChild(shadow);
  const coat = 0xb39a8b;
  const shade = 0x786f77;
  const light = 0xcebbab;
  const paw = 0xcbb5a5;
  const rect = (g: Graphics, x: number, y: number, w: number, h: number, color: number) => {
    g.rect(x, y, w, h).fill(color);
  };
  const head = (g: Graphics, x: number, y: number, closed = false) => {
    rect(g, x, y, 7, 6, coat);
    rect(g, x, y - 2, 2, 3, shade);
    rect(g, x + 5, y - 2, 2, 3, shade);
    rect(g, x + 1, y - 1, 1, 2, 0xc9a4a0);
    rect(g, x + 6, y - 1, 1, 2, 0xc9a4a0);
    rect(g, x + 5, y + 2, closed ? 2 : 1, 1, closed ? shade : 0xe7d7a7);
    rect(g, x + 6, y + 4, 2, 1, 0x5e5361);
  };
  const seatedBody = (g: Graphics) => {
    rect(g, -8, -7, 9, 7, shade);
    rect(g, -7, -8, 8, 7, coat);
    rect(g, -3, -12, 8, 12, coat);
    rect(g, -2, -9, 2, 4, shade);
    rect(g, 2, -10, 3, 7, light);
    rect(g, 2, -2, 3, 2, paw);
    rect(g, -11, -2, 7, 2, shade);
    rect(g, -12, -5, 2, 4, coat);
  };
  const frames = Array.from({ length: 9 }, (_, frame) => {
    const g = new Graphics();
    if (frame < 4) {
      rect(g, -8, -9, 12, 7, shade);
      rect(g, -7, -10, 12, 7, coat);
      head(g, 2, -13);
      rect(g, 3, -6, 4, 3, light);
      rect(g, -5, -10, 2, 3, shade);
      rect(g, -1, -10, 2, 3, shade);
      const stride = [0, 1, 0, -1][frame];
      rect(g, -6 + stride, -3, 2, 3, coat);
      rect(g, 3 - stride, -3, 2, 3, coat);
      rect(g, -6 + stride, -1, 3, 1, paw);
      rect(g, 3 - stride, -1, 3, 1, paw);
      const tailY = -10 + frame % 2;
      rect(g, -11, tailY, 4, 2, shade);
      rect(g, -12, tailY - 3, 2, 4, coat);
      rect(g, -11, tailY - 4, 2, 2, coat);
    } else if (frame < 7) {
      seatedBody(g);
      head(g, frame === 4 ? 0 : 1, frame === 4 ? -18 : -16, frame !== 4);
      if (frame > 4) {
        // A forepaw reaches the cheek, then lifts toward the ear while the body stays seated.
        rect(g, 5, -8, 2, 6, coat);
        rect(g, frame === 5 ? 6 : 4, frame === 5 ? -12 : -14, 3, 5, paw);
      }
    } else if (frame === 7) {
      // A low curled silhouette: the striped tail wraps around the sleeping body.
      rect(g, -9, -6, 17, 6, shade);
      rect(g, -7, -9, 12, 8, coat);
      rect(g, -9, -7, 16, 5, coat);
      head(g, 3, -7, true);
      rect(g, -5, -8, 2, 3, shade);
      rect(g, -1, -9, 2, 3, shade);
      rect(g, -10, -3, 3, 3, light);
      rect(g, -8, -2, 13, 2, light);
      rect(g, 3, -3, 4, 2, paw);
    } else {
      // Hindquarters stay high while the forelegs reach forward along the roof.
      rect(g, -9, -11, 7, 7, coat);
      rect(g, -4, -9, 10, 5, coat);
      rect(g, -8, -5, 2, 5, coat);
      rect(g, -8, -1, 3, 1, paw);
      rect(g, 3, -4, 9, 3, coat);
      rect(g, 10, -2, 4, 2, paw);
      rect(g, -6, -11, 2, 3, shade);
      rect(g, -2, -9, 2, 3, shade);
      head(g, 5, -9, true);
      rect(g, -11, -14, 3, 3, shade);
      rect(g, -12, -18, 2, 5, coat);
    }
    g.visible = false;
    art.addChild(g);
    return g;
  });

  function update(pose: CatPose) {
    art.x = pose.x;
    art.scale.x = pose.direction;
    shadow.scale.x = pose.frame === 8 ? 1.2 : 1;
    frames.forEach((frame, index) => { frame.visible = index === pose.frame; });
  }
  return { art, update };
}
