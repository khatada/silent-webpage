import { generatedArt } from './generated-art';
import type { generatedLayout } from './generated-layout';

/** Equal phases on the shared offscreen loop, with at least one train-length gap.
 * Four extra pixels leave two pixels of clearance before position rounding.
 */
export function trainServiceOffsets(width: number, trainWidth: number): number[] {
  return width >= 3 * trainWidth + 4 ? [0, (width + trainWidth) / 2] : [0];
}

export interface TrainServiceSchedule {
  width: number;
  length: number;
  count: number;
  period: number;
  speed: number;
  travelDuration: number;
  startGap: number;
  phase: number;
  clearance: number;
}

/** One direction owns the track until its last train has completely left it. */
export function createTrainServiceSchedule(width: number, length: number, baseSpeed: number,
  initialX: number): TrainServiceSchedule {
  if (![width, length, baseSpeed, initialX].every(Number.isFinite)
    || width <= 0 || length <= 0 || baseSpeed <= 0) throw new RangeError('Train geometry must be finite and positive.');
  const count = trainServiceOffsets(width, length).length;
  const span = width + length;
  const period = span / baseSpeed;
  // Retain a useful clearance even for unusually short synthetic geometries.
  const clearance = Math.min(0.5, period / 4);
  const gap = Math.max(4, baseSpeed / 4);
  const speed = (span + (count - 1) * (2 * length + gap)) / (period - clearance);
  const travelDuration = span / speed;
  const startGap = (2 * length + gap) / speed;
  const wrappedInitialX = ((initialX + length) % span + span) % span - length;
  return { width, length, count, period, speed, travelDuration, startGap,
    phase: (wrappedInitialX + length) / speed, clearance };
}

/** Deterministic batches alternate directions and colours without visible in-place reversals. */
export function trainServiceState(schedule: TrainServiceSchedule, seconds: number) {
  if (!Number.isFinite(seconds)) throw new RangeError('Train time must be finite.');
  const time = seconds + schedule.phase;
  const batch = Math.floor(time / schedule.period);
  const local = time - batch * schedule.period;
  const direction: 1 | -1 = ((batch % 2) + 2) % 2 === 0 ? 1 : -1;
  return Array.from({ length: schedule.count }, (_, index) => {
    const age = local - index * schedule.startGap;
    const colour = ((batch * schedule.count + index) % 2 + 2) % 2 as 0 | 1;
    return { direction, colour, visible: age > 0 && age < schedule.travelDuration,
      x: Math.floor(direction === 1 ? -schedule.length + schedule.speed * age
        : schedule.width - schedule.speed * age) };
  });
}

/** Production dimensions and initial pole alignment shared with visual review tools. */
export function sceneTrainService(width: number, height: number, layout: ReturnType<typeof generatedLayout>) {
  const scale = layout.motionScale * 0.24 * layout.composition.actorScale;
  const length = generatedArt.frames.train[2] * scale;
  const sourceX = (value: number) => Math.round(layout.originX + value * layout.scale);
  const sourceY = (value: number) => Math.round(layout.originY + value * layout.scale);
  let initialX = width * 0.1, nearest = Infinity;
  for (const [x, y, w, h] of layout.composition.railPoles) {
    if (sourceX(x + w) <= 0 || sourceX(x) >= width || sourceY(y + h) <= 0 || sourceY(y) >= height) continue;
    const center = sourceX(x + w / 2), distance = Math.abs(center - width * 0.25);
    if (distance < nearest) { nearest = distance; initialX = center - length / 2; }
  }
  return { scale, initialX, schedule: createTrainServiceSchedule(width, length, layout.motionScale * 16, initialX) };
}
