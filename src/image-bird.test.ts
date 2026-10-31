import { describe, expect, it } from 'vitest';
import { Texture, TextureSource } from 'pixi.js';
import { birdArt, birdGeometry, birdState, createImageBird } from './image-bird';
import { generatedLayout } from './generated-layout';
import { pixelViewport } from './pixel-viewport';
import { generatedArt } from './generated-art';
import { cityMotion } from './city-motion';
import { oppositeAircraftArt, oppositeAircraftGeometry } from './opposite-aircraft';
import { travelPosition } from './animation';

describe('bird flight', () => {
  it('stays in the sky with a readable physical size, and omits cramped views', () => {
    for (const [w, h, dpr] of [[1440, 900, 1], [800, 600, 1], [390, 844, 2], [375, 667, 1.25]]) {
      const v = pixelViewport(w, h, dpr), layout = generatedLayout(v.width, v.height);
      const g = birdGeometry(v.width, layout, v.physicalScale);
      expect(g.visible).toBe(true);
      expect(g.y).toBeGreaterThanOrEqual(4);
      expect(g.y + g.height).toBeLessThanOrEqual(layout.skyBottom - 3);
      expect(105 * g.scale * v.physicalScale).toBeGreaterThanOrEqual(32);
      expect(105 * g.scale * v.physicalScale).toBeLessThanOrEqual(48.001);
    }
    expect(birdGeometry(200, generatedLayout(200, 360), 1).visible).toBe(false);
    expect(birdGeometry(844, generatedLayout(844, 390), 2).visible).toBe(false);
  });
  it('enters and exits completely before resting, using a deterministic shared clock', () => {
    const g = birdGeometry(800, generatedLayout(800, 600), 1);
    expect(birdState(0, 800, g).visible).toBe(false);
    expect(birdState(g.first, 800, g).x).toBe(g.direction === 1 ? -120 * g.scale : 800);
    expect(birdState(g.first + g.duration - 0.001, 800, g).visible).toBe(true);
    expect(birdState(g.first + g.duration + 0.000001, 800, g).visible).toBe(false);
    expect(birdState(g.first + g.period + 0.000001, 800, g).x).toBeCloseTo(g.direction === 1 ? -120 * g.scale : 800, 3);
    expect(birdState(12, 800, g)).toEqual(birdState(12, 800, g));
  });
  it('uses each intermediate wing pose in both directions with registered eyes', () => {
    const source = new Texture({ source: new TextureSource({ width: 724, height: 241 }) });
    const factory = createImageBird(source), g = birdGeometry(800, generatedLayout(800, 600), 1), sprite = factory.createSprite(g);
    const eyeX = [104, 98, 99, 105, 100], eyeY = [79, 78, 78, 79, 78];
    for (const [index, frame] of birdArt.order.entries()) {
      const t = g.first + (index + 0.5) * birdArt.frameSeconds;
      const state = birdState(t, 800, g);
      expect(state.frame).toBe(frame);
      factory.update(sprite, t, 800, g);
      expect(sprite.texture.frame.x).toBe(frame * 120);
      expect(eyeX[frame] + birdArt.eyeOffsets[frame][0]).toBe(104);
      expect(eyeY[frame] + birdArt.eyeOffsets[frame][1]).toBe(79);
    }
    sprite.destroy(); factory.destroy(); source.destroy(true);
  });
  it('keeps the bird clear of aircraft in its lane throughout repeated flights', () => {
    for (const [w, h, dpr] of [[1440, 900, 1], [2560, 1080, 1], [800, 600, 1], [390, 844, 2], [375, 667, 1.25]]) {
      const v = pixelViewport(w, h, dpr), layout = generatedLayout(v.width, v.height);
      const g = birdGeometry(v.width, layout, v.physicalScale), other = oppositeAircraftGeometry(v.width, layout);
      const mainW = generatedArt.frames.aircraft[2] * layout.aircraftScale;
      const mainH = generatedArt.frames.aircraft[3] * layout.aircraftScale;
      for (let t = g.first; t < g.first + g.period * 2; t += 0.05) {
        const state = birdState(t, v.width, g); if (!state.visible) continue;
        const [dx, dy] = birdArt.eyeOffsets[state.frame];
        const bx = Math.round(state.x + g.direction * dx * g.scale), by = Math.round(g.y + dy * g.scale);
        const intersects = (x: number, y: number, width: number, height: number) =>
          bx < x + width && bx + 120 * g.scale > x && by < y + height && by + g.height > y;
        expect(intersects(travelPosition(t, v.width, mainW, layout.motionScale * cityMotion.aircraftSpeed, v.width * 0.7),
          layout.aircraftY, mainW, mainH)).toBe(false);
        if (other.visible) expect(intersects(travelPosition(t, v.width, other.width, -layout.motionScale * cityMotion.aircraftSpeed,
          v.width * oppositeAircraftArt.initialFraction), other.y, other.width, other.height)).toBe(false);
      }
    }
  });
});
