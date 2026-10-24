import { Application, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';

/** Crop a whole-background render, so half-scale nearest ties match production exactly. */
export function windowReviewBackground(app: Application, source: Texture) {
  const rendered = new Map<number, RenderTexture>();
  return (context: readonly [number, number, number, number], scale: number, originX: number, originY: number) => {
    let target = rendered.get(scale);
    if (!target) {
      target = RenderTexture.create({ width: source.width * scale, height: source.height * scale,
        resolution: 1, antialias: false });
      target.source.scaleMode = 'nearest';
      const background = new Sprite(source);
      background.roundPixels = true;
      background.scale.set(scale);
      app.renderer.render({ container: background, target, clear: true });
      background.destroy();
      rendered.set(scale, target);
    }
    const [x, y, width, height] = context;
    const left = Math.floor(x * scale), top = Math.floor(y * scale);
    const frame = new Rectangle(left, top, Math.ceil((x + width) * scale) - left,
      Math.ceil((y + height) * scale) - top);
    const sprite = new Sprite(new Texture({ source: target.source, frame }));
    sprite.position.set(originX + left, originY + top);
    return sprite;
  };
}
