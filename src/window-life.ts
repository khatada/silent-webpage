import { Container, Graphics } from 'pixi.js';
import { occupiedWindows, residentPose, windowPhase } from './window-timing';

interface Room { x: number; y: number; art: Container }

/** Tiny neutral figures remain behind window frames and inherit each room's light. */
export function createWindowLife(rooms: readonly Room[]): { update(seconds: number): void } {
  const residents = occupiedWindows(rooms).map((room) => {
    const figure = new Graphics()
      .rect(1, 0, 1, 1)
      .rect(0, 1, 2, 3)
      .fill(0x705e67);
    figure.y = room.y + 2;
    // Room children are the warm glass and then its frame; figures live between them.
    room.art.addChildAt(figure, 1);
    return { room, figure, phase: windowPhase(room) };
  });
  return {
    update(seconds) {
      for (const { room, figure, phase } of residents) {
        const pose = residentPose(seconds, phase);
        figure.x = room.x + pose.x;
        figure.alpha = pose.alpha * 0.8;
        figure.visible = pose.alpha > 0;
      }
    },
  };
}
