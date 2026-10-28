import { Rectangle, Texture, TextureSource } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { createLogicalBackground } from './logical-background';

describe('logical generated background view', () => {
  it('replaces a cached native frame with correct full-image and native-pixel UVs without taking source ownership', () => {
    const source = new TextureSource({ width: 1446, height: 482 });
    const cached = new Texture({ source });
    const logical = createLogicalBackground(cached, 723, 241, 2);
    expect(source.pixelWidth).toBe(1446);
    expect(source.width).toBe(723);
    expect(cached.frame.width).toBe(1446);
    expect(logical.width).toBe(723);
    expect(logical.height).toBe(241);
    expect(logical.uvs.x2).toBe(1);
    expect(logical.uvs.y2).toBe(1);
    const core = new Texture({ source: logical.source, frame: new Rectangle(371, 51, 0.5, 0.5) });
    expect(core.uvs.x0).toBeCloseTo(742 / 1446);
    expect(core.uvs.y0).toBeCloseTo(102 / 482);
    expect(core.uvs.x2 - core.uvs.x0).toBeCloseTo(1 / 1446);
    expect(core.uvs.y2 - core.uvs.y0).toBeCloseTo(1 / 482);
    core.destroy(false);
    logical.destroy(false);
    expect(source.destroyed).toBe(false);
    const reused = createLogicalBackground(cached, 723, 241, 2);
    expect(reused.uvs.x2).toBe(1);
    reused.destroy(false);
    cached.destroy(true);
  });
});
