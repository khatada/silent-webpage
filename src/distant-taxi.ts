import { Container, Graphics } from 'pixi.js';
import { taxiPose } from './taxi-timing';

/** A short glimpse of a neighborhood street; the surrounding facades hide the car's route. */
export function createDistantTaxi({ left, width, y }: {
  left: number; width: number; y: number;
}): { art: Container; update(seconds: number): void } {
  const art = new Container();
  const road = new Graphics().rect(left - 10, y - 3, width + 20, 10).fill(0x171e30);
  art.addChild(road);
  const car = new Graphics()
    .rect(0, 0, 10, 3).fill(0x575366)
    .rect(2, -1, 5, 1).fill(0x8c8790)
    .rect(3, -1, 3, 1).fill(0xc5a17f)
    .rect(4, -2, 2, 1).fill(0xd6ac75)
    .rect(9, 1, 1, 1).fill(0xe4cfaa)
    .rect(0, 1, 1, 1).fill(0xa1646c)
    .rect(1, 3, 2, 1).rect(7, 3, 2, 1).fill(0x101827);
  car.y = y;
  art.addChild(car);
  return {
    art,
    update(seconds) {
      const pose = taxiPose(seconds, left, width);
      car.x = pose.x;
      car.visible = pose.visible;
    },
  };
}
