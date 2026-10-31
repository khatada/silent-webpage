import { Rectangle, Sprite, Texture } from 'pixi.js';
import { travelPosition } from './animation';
import { cityMotion } from './city-motion';
import { generatedArt } from './generated-art';
import type { generatedLayout } from './generated-layout';
import { oppositeAircraftArt, oppositeAircraftGeometry } from './opposite-aircraft';

/** Corrected imagegen sheet. The eye offsets register all poses to one fixed point. */
export const birdArt = { image: 'art/night-bird-flight.png', frame: [120, 152],
  frameY: 48, eyeOffsets: [[0, 0], [6, 1], [5, 1], [-1, 0], [4, 1]],
  order: [0, 1, 2, 3, 4, 3, 2, 1], frameSeconds: 0.14, first: 9, rest: 18 } as const;

/** Size uses physical pixels so a high-density phone does not shrink the bird. */
export function birdGeometry(width: number, layout: ReturnType<typeof generatedLayout>, physicalScale: number) {
  const skyBottom = layout.skyBottom;
  const density = Number.isFinite(physicalScale) && physicalScale > 0 ? physicalScale : 1;
  const target = Math.min(48, width * density * 0.12);
  const scale = Math.min(target / (105 * density), Math.max(0, skyBottom - 8) / birdArt.frame[1]);
  const physicalWidth = 105 * scale * density;
  const height = birdArt.frame[1] * scale;
  const y = 4;
  const mainWidth = generatedArt.frames.aircraft[2] * layout.aircraftScale;
  const mainHeight = generatedArt.frames.aircraft[3] * layout.aircraftScale;
  const opposite = oppositeAircraftGeometry(width, layout);
  const mainOverlap = y < layout.aircraftY + mainHeight && y + height > layout.aircraftY;
  const oppositeOverlap = opposite.visible && y < opposite.y + opposite.height && y + height > opposite.y;
  // Two opposing aircraft in the same narrow vertical lane leave no safe bird route.
  const laneClear = !(mainOverlap && oppositeOverlap);
  const direction: 1 | -1 = oppositeOverlap ? -1 : 1;
  const planeWidth = oppositeOverlap ? opposite.width : mainWidth;
  const planeInitial = width * (oppositeOverlap ? oppositeAircraftArt.initialFraction : 0.7);
  const speed = layout.motionScale * cityMotion.aircraftSpeed;
  const birdWidth = birdArt.frame[0] * scale;
  const planePeriod = (width + planeWidth) / speed;
  let first: number = birdArt.first;
  let entryFound = !(mainOverlap || oppositeOverlap);
  if (mainOverlap || oppositeOverlap) {
    // Travel at the same speed and in the same direction as the aircraft in this lane.
    // Pick an entry with enough space both now and when the aircraft wraps behind it.
    for (let step = 0; step <= Math.ceil(planePeriod * 10); step++) {
      const time = birdArt.first + step / 10;
      const planeX = travelPosition(time, width, planeWidth, direction * speed, planeInitial);
      const safe = direction === 1 ? planeX >= 4 && planeX <= width - birdWidth - 4
        : planeX >= birdWidth - planeWidth + 4 && planeX + planeWidth <= width - 4;
      if (safe) { first = time; entryFound = true; break; }
    }
  }
  const duration = (width + birdArt.frame[0] * scale) / speed;
  const period = mainOverlap || oppositeOverlap ? Math.ceil((duration + birdArt.rest) / planePeriod) * planePeriod
    : duration + birdArt.rest;
  return { scale, height, y, speed, duration, period, first, direction, visible: width > 0 && skyBottom > 8
    && Number.isFinite(width) && Number.isFinite(skyBottom) && physicalWidth >= 32 && laneClear && entryFound };
}

export function birdState(seconds: number, width: number, geometry: ReturnType<typeof birdGeometry>) {
  if (!geometry.visible || !Number.isFinite(seconds) || seconds < geometry.first)
    return { visible: false, frame: 0, x: geometry.direction === 1 ? -birdArt.frame[0] * geometry.scale : width };
  const phase = (seconds - geometry.first) % geometry.period;
  const visible = phase >= 0 && phase < geometry.duration;
  const frame = birdArt.order[Math.floor(phase / birdArt.frameSeconds) % birdArt.order.length];
  return { visible, frame, x: geometry.direction === 1 ? -birdArt.frame[0] * geometry.scale + phase * geometry.speed
    : width - phase * geometry.speed };
}

export function createImageBird(source: Texture) {
  source.source.scaleMode = 'nearest';
  const textures = birdArt.eyeOffsets.map((_, index) => new Texture({ source: source.source,
    frame: new Rectangle(index * birdArt.frame[0], birdArt.frameY, ...birdArt.frame) }));
  function createSprite(geometry: ReturnType<typeof birdGeometry>) {
    const sprite = new Sprite(textures[0]);
    sprite.roundPixels = true;
    sprite.anchor.set(geometry.direction === -1 ? 1 : 0, 0);
    sprite.scale.set(geometry.direction * geometry.scale, geometry.scale);
    sprite.visible = false;
    return sprite;
  }
  function update(sprite: Sprite, seconds: number, width: number, geometry: ReturnType<typeof birdGeometry>) {
    const state = birdState(seconds, width, geometry);
    sprite.visible = state.visible;
    if (!state.visible) return;
    sprite.texture = textures[state.frame];
    const [dx, dy] = birdArt.eyeOffsets[state.frame];
    sprite.position.set(Math.round(state.x + geometry.direction * dx * geometry.scale), Math.round(geometry.y + dy * geometry.scale));
  }
  return { createSprite, update, destroy() { textures.forEach(texture => texture.destroy(false)); } };
}
