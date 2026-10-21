import { Container, Graphics } from 'pixi.js';
import { curtainedWindows, curtainOffset } from './window-timing';

export interface CurtainRoom { x: number; y: number; art: Container }

/** Narrow fabric edges share the room's fading light and stay behind its fixed window frame. */
export function createWindowCurtains(rooms: readonly CurtainRoom[]): { update(seconds: number): void } {
  const curtains = curtainedWindows(rooms).map(room => {
    const art = new Container();
    art.position.set(room.x, room.y);
    const top = new Graphics()
      .rect(1, 0.5, 1.5, 2.5).fill(0xa48d96)
      .rect(1.5, 1, 0.5, 1.5).fill(0x927e8d);
    const edge = new Graphics()
      .rect(1, 2.5, 1.5, 3.5).fill(0xa48d96)
      .rect(1.5, 3, 0.5, 2.5).fill(0x927e8d)
      .rect(1, 5.5, 1.5, 0.5).fill(0xb29c9f);
    art.addChild(top, edge);
    // The stationary upper cloth overlaps the moving edge so it remains attached.
    room.art.addChildAt(art, 1);
    return edge;
  });
  return {
    update(seconds) {
      const offset = curtainOffset(seconds);
      for (const edge of curtains) edge.x = offset;
    },
  };
}
