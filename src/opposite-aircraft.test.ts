import { Sprite, Texture, TextureSource } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { travelPosition } from './animation';
import { generatedLayout } from './generated-layout';
import { oppositeAircraftArt, oppositeAircraftGeometry } from './opposite-aircraft';

const viewports = [[1440, 900], [390, 844], [295, 844], [844, 390], [2560, 1080],
  [800, 600], [390, 1025], [900, 1600], [1024, 1537], [320, 568], [375, 667]] as const;

describe('opposite aircraft lane', () => {
  it('keeps readable aircraft separated from the primary flight and omits crowded skies', () => {
    const layouts = viewports.map(([width, height]) => generatedLayout(width, height));
    const geometries = layouts.map((layout, index) => oppositeAircraftGeometry(viewports[index][0], layout));
    expect(geometries.map(geometry => geometry.visible)).toEqual(
      [true, false, false, true, true, true, true, true, true, true, true]);
    geometries.forEach((geometry, index) => {
      if (!geometry.visible) return;
      expect(geometry.width).toBeGreaterThanOrEqual(oppositeAircraftArt.minimumWidth);
      expect(geometry.y).toBeGreaterThanOrEqual(geometry.margin);
      expect(geometry.y + geometry.height).toBeLessThanOrEqual(layouts[index].skyBottom - geometry.margin);
      expect(layouts[index].aircraftY - geometry.y - geometry.height).toBeGreaterThanOrEqual(geometry.gap);
    });
  });

  it('restores the upper lane after resize and rejects tiny or horizontally cramped views', () => {
    const base = { aircraftScale: 1, scale: 1, skyBottom: 200, aircraftY: 85 };
    expect([85, 86, 85, 86].map(aircraftY =>
      oppositeAircraftGeometry(400, { ...base, aircraftY }).visible)).toEqual([false, true, false, true]);
    expect(oppositeAircraftGeometry(400, { ...base, aircraftY: 86 }).y).toBe(2);
    expect(oppositeAircraftGeometry(100, { ...base, aircraftY: 86 }).visible).toBe(false);
    expect(oppositeAircraftGeometry(400, { ...base, aircraftScale: 0.01 }).visible).toBe(false);
    const shortSky = oppositeAircraftGeometry(400, { ...base, aircraftY: 86, skyBottom: 1 });
    expect(shortSky.visible).toBe(false);
    expect(shortSky.y).toBeGreaterThanOrEqual(shortSky.margin);
  });

  it('uses left bounds for mirrored sprites and re-enters only at the opposite screen edge', () => {
    const geometry = oppositeAircraftGeometry(1440, generatedLayout(1440, 900));
    const texture = new Texture({ source: new TextureSource({ width: 219, height: 100 }) });
    const aircraft = new Sprite(texture);
    aircraft.anchor.set(1, 0);
    aircraft.scale.set(-geometry.scale, geometry.scale);
    aircraft.position.set(100, geometry.y);
    const bounds = aircraft.getBounds();
    expect(bounds.x).toBe(100);
    expect(bounds.width).toBeCloseTo(geometry.width);
    const width = 1440, speed = 20, initialX = width * oppositeAircraftArt.initialFraction;
    const span = width + geometry.width;
    const firstWrap = (initialX + geometry.width) / speed;
    expect(travelPosition(1, width, geometry.width, -speed, initialX))
      .toBe(travelPosition(0, width, geometry.width, -speed, initialX) - speed);
    for (const cycle of [0, 1, 2]) {
      const time = firstWrap + cycle * span / speed;
      const before = travelPosition(time - 0.0001, width, geometry.width, -speed, initialX);
      const after = travelPosition(time + 0.0001, width, geometry.width, -speed, initialX);
      expect(before + geometry.width).toBeLessThanOrEqual(0);
      expect(after).toBeGreaterThanOrEqual(width - 1);
    }
    aircraft.destroy();
    texture.destroy(true);
  });
});
