import { generatedArt } from './generated-art';

/** Keep the sky, railway and rooftop in view while preserving integer image magnification. */
export function generatedLayout(width: number, height: number) {
  const normalScale = Math.ceil(Math.max(width / generatedArt.width, height / generatedArt.height));
  const normalOriginY = Math.min(Math.round((height - generatedArt.height * normalScale) / 2),
    height - (generatedArt.floor + generatedArt.floorMargin) * normalScale);
  const normalOriginX = Math.round((width - generatedArt.width * normalScale) / 2);
  const hasVisibleStar = generatedArt.stars.some(([x, y]) => {
    const px = normalOriginX + x * normalScale;
    const py = normalOriginY + y * normalScale;
    return px >= 0 && px < width && py >= 8 && py < height;
  });
  // Integer zoom can crop the sky before the aspect-ratio threshold is reached.
  const fallback = width / height >= 1.75 || !hasVisibleStar
    || normalOriginY + 90 * normalScale < height * 0.05;
  const portrait = fallback && width / height < 0.8;
  const wide = fallback && !portrait;
  const composition = portrait ? generatedArt.portrait : wide ? generatedArt.wide : generatedArt;
  const coverScale = Math.ceil(Math.max(width / composition.width, height / composition.height));
  const requiredSky = Math.ceil(height * 0.05);
  const scenerySpan = composition.floor + composition.floorMargin - composition.skyBottom;
  const maximumScale = Math.max(1 / (composition.height * 2), (height - requiredSky) / scenerySpan);
  // Reciprocal integer downsampling keeps a uniform nearest-neighbour output grid on small phones.
  const unquantizedScale = maximumScale < 1 ? 1 / Math.ceil(1 / maximumScale)
    : Math.min(coverScale, Math.floor(maximumScale));
  // Actor size and travel retain the previous wide composition, independently of background sampling.
  const legacyMaximum = Math.max(1 / 482, (height - requiredSky) / (222 + 8 - 55));
  const motionScale = wide ? (legacyMaximum < 1 ? 1 / Math.ceil(1 / legacyMaximum)
    : Math.min(Math.ceil(Math.max(width / 724, height / 241)), Math.floor(legacyMaximum))) : unquantizedScale;
  let scale = unquantizedScale;
  if (wide && maximumScale >= 2) {
    const minimumEven = 2 * Math.ceil(width / (composition.width * 2));
    const maximumEven = 2 * Math.floor(maximumScale / 2);
    const preferredEven = Math.max(2, 2 * Math.ceil(motionScale / 2 - 0.5));
    scale = Math.min(maximumEven, Math.max(minimumEven, preferredEven));
  } else if (wide && maximumScale >= 1) scale = 1;
  const originX = Math.round((width - composition.width * scale) / 2);
  const minimumY = requiredSky - composition.skyBottom * scale;
  const maximumY = height - (composition.floor + composition.floorMargin) * scale;
  const centeredY = Math.round((height - composition.height * scale) / 2);
  const originY = Math.round(Math.max(minimumY, Math.min(centeredY, maximumY)));
  const sourceY = (value: number) => Math.round(originY + value * scale);
  const railBottom = sourceY(composition.railBottom);
  const skyBottom = sourceY(composition.skyBottom);
  const skyRoom = Math.max(1, skyBottom - 2 * scale);
  const aircraftScale = Math.min(motionScale * 0.17 * composition.actorScale, skyRoom / 100);
  const cloudScale = Math.min(motionScale * 0.7 * composition.actorScale, skyRoom / 70);
  const skyY = (source: number, actorHeight: number) => Math.round(Math.max(2 * scale,
    Math.min(sourceY(source), skyBottom - actorHeight)));
  return {
    wide, portrait, composition, scale, motionScale, originX, originY, railBottom, skyBottom, aircraftScale, cloudScale,
    aircraftY: skyY(composition.aircraftY, 100 * aircraftScale),
    cloudY: skyY(composition.cloudY, 70 * cloudScale),
    catY: Math.min(height - (wide ? 4 : 8) * scale, sourceY(composition.floor)),
  };
}
