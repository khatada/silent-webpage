import { generatedArt } from './generated-art';
import type { generatedLayout } from './generated-layout';

type Layout = Pick<ReturnType<typeof generatedLayout>, 'scale' | 'skyBottom' | 'aircraftScale' | 'aircraftY'>;

export const oppositeAircraftArt = { relativeScale: 0.8, minimumWidth: 24, initialFraction: 0.42 } as const;

/** Keep a readable second aircraft in a separate upper lane; never shrink it to fit. */
export function oppositeAircraftGeometry(viewportWidth: number, layout: Layout) {
  const scale = layout.aircraftScale * oppositeAircraftArt.relativeScale;
  const width = generatedArt.frames.aircraft[2] * scale;
  const height = generatedArt.frames.aircraft[3] * scale;
  const margin = Math.ceil(2 * layout.scale);
  const gap = Math.max(4, Math.ceil(3 * layout.scale));
  const maxY = Math.floor(Math.min(layout.aircraftY - gap, layout.skyBottom - margin) - height);
  const y = Math.max(margin, Math.min(Math.round(layout.skyBottom * 0.25), maxY));
  const visible = scale > 0 && width >= oppositeAircraftArt.minimumWidth
    && width <= viewportWidth - 2 * margin && maxY >= margin;
  return { scale, width, height, y, margin, gap, visible };
}
