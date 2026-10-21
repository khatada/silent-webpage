export interface PixelImage { width: number; height: number; data: Uint8Array }
export interface GridCorrection {
  cellSize: number;
  offsetX?: number;
  offsetY?: number;
  outputScale?: number;
}

/** Bound both decoded input and generated output to 64 MiB of RGBA pixels. */
export const MAX_ART_PIXELS = 16_000_000;

export function validateImageSize(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width * height > MAX_ART_PIXELS) throw new Error('Image must contain 1–16,000,000 pixels.');
}

/** Recover a declared uniform grid. This does not infer a grid or repair local warping. */
export function correctPixelArt(input: PixelImage, options: GridCorrection): PixelImage {
  validateImageSize(input.width, input.height);
  if (input.data.length !== input.width * input.height * 4) throw new Error('Invalid RGBA buffer length.');
  const { cellSize, offsetX = 0, offsetY = 0, outputScale = 1 } = options;
  if (!Number.isFinite(cellSize) || cellSize < 1) throw new Error('cellSize must be finite and at least 1.');
  if (![offsetX, offsetY].every(value => Number.isFinite(value) && value >= 0 && value < cellSize)) {
    throw new Error('Offsets must be finite, nonnegative and smaller than cellSize.');
  }
  if (!Number.isSafeInteger(outputScale) || outputScale < 1) throw new Error('outputScale must be a positive integer.');
  const columns = Math.floor((input.width - offsetX) / cellSize);
  const rows = Math.floor((input.height - offsetY) / cellSize);
  const width = columns * outputScale;
  const height = rows * outputScale;
  validateImageSize(width, height);
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = offsetX + column * cellSize;
      const top = offsetY + row * cellSize;
      const centerX = left + cellSize / 2;
      const centerY = top + cellSize / 2;
      const colors = new Map<number, { count: number; distance: number; index: number }>();
      // Pixel centers define membership, including on noninteger source grids.
      for (let y = Math.max(0, Math.ceil(top - 0.5)); y < Math.ceil(top + cellSize - 0.5); y++) {
        for (let x = Math.max(0, Math.ceil(left - 0.5)); x < Math.ceil(left + cellSize - 0.5); x++) {
          const index = (y * input.width + x) * 4;
          const color = ((input.data[index] << 24) | (input.data[index + 1] << 16)
            | (input.data[index + 2] << 8) | input.data[index + 3]) >>> 0;
          const distance = (x + 0.5 - centerX) ** 2 + (y + 0.5 - centerY) ** 2;
          const entry = colors.get(color);
          if (entry) {
            entry.count++;
            if (distance < entry.distance) { entry.distance = distance; entry.index = index; }
          } else {
            if (colors.size === 65_536) throw new Error('A grid cell contains too many distinct colors; use a finer source grid.');
            colors.set(color, { count: 1, distance, index });
          }
        }
      }
      let chosen: { count: number; distance: number; index: number } | undefined;
      for (const entry of colors.values()) {
        if (!chosen || entry.count > chosen.count || (entry.count === chosen.count && entry.distance < chosen.distance)) chosen = entry;
      }
      if (!chosen) throw new Error('Grid cell contains no source pixels.');
      for (let dy = 0; dy < outputScale; dy++) {
        for (let dx = 0; dx < outputScale; dx++) {
          const target = ((row * outputScale + dy) * width + column * outputScale + dx) * 4;
          data.set(input.data.subarray(chosen.index, chosen.index + 4), target);
        }
      }
    }
  }
  return { width, height, data };
}
