import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

/** Reflect original pixels at image boundaries; narrow side strips exclude the generated moon. */
export function mirroredBackgroundTiles(width: number, height: number, imageWidth: number, imageHeight: number,
  scale: number, originX: number, originY: number) {
  const spanX = imageWidth * scale, spanY = imageHeight * scale;
  const stripWidth = Math.min(80, imageWidth), stripSpan = stripWidth * scale;
  const columns = [{ x: originX, scaleX: scale, sourceX: 0, sourceWidth: imageWidth }];
  for (const direction of [-1, 1]) {
    let boundary = direction < 0 ? originX : originX + spanX;
    let reflected = true;
    while (direction < 0 ? boundary > 0 : boundary < width) {
      columns.push({ x: direction < 0 ? boundary - (reflected ? 0 : stripSpan)
        : boundary + (reflected ? stripSpan : 0), scaleX: reflected ? -scale : scale,
      sourceX: direction < 0 ? 0 : imageWidth - stripWidth, sourceWidth: stripWidth });
      boundary += direction * stripSpan;
      reflected = !reflected;
    }
  }
  const tiles = [];
  for (let row = Math.floor(-originY / spanY); row < Math.ceil((height - originY) / spanY); row++) {
    const flipY = Math.abs(row) % 2 === 1;
    for (const column of columns) tiles.push({ ...column,
      y: originY + (row + Number(flipY)) * spanY, scaleY: flipY ? -scale : scale, row });
  }
  return tiles;
}

export function createImageWideBackground(background: Texture, width: number, height: number,
  scale: number, originX: number, originY: number) {
  const root = new Container();
  const crops = new Map<string, Texture>();
  for (const tile of mirroredBackgroundTiles(width, height, background.width, background.height, scale, originX, originY)) {
    let texture = background;
    if (tile.sourceWidth !== background.width) {
      const key = `${tile.sourceX}:${tile.sourceWidth}`;
      if (!crops.has(key)) crops.set(key, new Texture({ source: background.source,
        frame: new Rectangle(tile.sourceX, 0, tile.sourceWidth, background.height) }));
      texture = crops.get(key)!;
    }
    const art = new Sprite(texture);
    art.roundPixels = false;
    art.position.set(tile.x, tile.y);
    art.scale.set(tile.scaleX, tile.scaleY);
    root.addChild(art);
  }
  return { root, destroy() { crops.forEach(texture => texture.destroy(false)); } };
}
