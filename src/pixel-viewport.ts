export interface PixelViewport {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  physicalScale: number;
  worldScale: number;
  worldWidth: number;
}

/** Present every rendered pixel as the same integer number of physical screen pixels. */
export function pixelViewport(cssWidth: number, cssHeight: number, devicePixelRatio: number): PixelViewport {
  const positive = (value: number, fallback: number) => Number.isFinite(value) && value > 0 ? value : fallback;
  const ratio = positive(devicePixelRatio, 1);
  const physicalScale = Math.max(1, Math.round(ratio));
  const width = Math.ceil(positive(cssWidth, 1280) * ratio / physicalScale);
  const height = Math.ceil(positive(cssHeight, 800) * ratio / physicalScale);
  const worldScale = height / 400;
  return {
    width, height, physicalScale, worldScale,
    cssWidth: width * physicalScale / ratio,
    cssHeight: height * physicalScale / ratio,
    worldWidth: width / worldScale,
  };
}
