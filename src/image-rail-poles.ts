import { Rectangle, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';

type Rect = readonly [number, number, number, number];

/** Sample the whole generated background before cropping: subtexture nearest ties differ at half scale. */
export function createImageRailPoles(renderer: Renderer, background: Texture, frames: readonly Rect[],
  scale: number, originX: number, originY: number, width: number, height: number) {
  const whole = RenderTexture.create({ width, height, resolution: 1 });
  whole.source.scaleMode = 'nearest';
  const backdrop = new Sprite(background);
  backdrop.roundPixels = false;
  backdrop.position.set(originX, originY);
  backdrop.scale.set(scale);
  renderer.render({ container: backdrop, target: whole, clear: true });
  backdrop.destroy();
  const textures: Texture[] = [];
  const poles = frames.flatMap(frame => {
    const [x, y, w, h] = frame;
    const left = Math.max(0, Math.floor(originX + x * scale));
    const top = Math.max(0, Math.floor(originY + y * scale));
    const right = Math.min(width, Math.ceil(originX + (x + w) * scale));
    const bottom = Math.min(height, Math.ceil(originY + (y + h) * scale));
    if (left >= right || top >= bottom) return [];
    const texture = new Texture({ source: whole.source, frame: new Rectangle(left, top, right - left, bottom - top) });
    textures.push(texture);
    const art = new Sprite(texture);
    art.roundPixels = false;
    art.position.set(left, top);
    return [{ art, frame }];
  });
  return { poles, destroy() { textures.forEach(texture => texture.destroy(false)); whole.destroy(true); } };
}
