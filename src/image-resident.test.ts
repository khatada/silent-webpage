import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { createImageResident } from './image-resident';
import { roomLightAreas } from './image-room-lights';

describe('wide window resident', () => {
  it('keeps every pose in the selected glass at the same anchor across wide scales', () => {
    const source = new Texture({ source: new TextureSource({ width: 256, height: 128 }) });
    const factory = createImageResident(source);
    const glass = roomLightAreas[1].glass;
    for (const scale of [2, 4, 6]) {
      const resident = factory.createSprite(glass, 2, scale, 0, 0);
      const position = resident.position.clone();
      const frames = new Set<number>();
      for (const seconds of [0, 7, 9]) {
        factory.update(resident, seconds, 2);
        const bounds = resident.getBounds().rectangle;
        expect(resident.position.equals(position)).toBe(true);
        expect(bounds.x).toBeGreaterThanOrEqual(glass[0] * scale);
        expect(bounds.y).toBeGreaterThanOrEqual(glass[1] * scale);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual((glass[0] + glass[2]) * scale);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual((glass[1] + glass[3]) * scale);
        frames.add(resident.texture.frame.x);
      }
      expect(frames.size).toBe(3);
      resident.destroy();
    }
    factory.destroy(); source.destroy(true);
  });
});
