import { describe, expect, it } from 'vitest';
import { parsePreferences } from './preferences';
describe('saved preferences', () => {
  it('recovers from malformed storage', () => {
    for (const raw of [null, '{', 'null', '42', '"text"']) {
      expect(parsePreferences(raw)).toEqual({ volume: 0.35, reduceMotion: false });
    }
  });
  it('clamps stored volume and rejects invalid types', () => {
    expect(parsePreferences('{"volume":2,"reduceMotion":true}')).toEqual({ volume: 1, reduceMotion: true });
    expect(parsePreferences('{"volume":-2,"reduceMotion":"yes"}')).toEqual({ volume: 0, reduceMotion: false });
    expect(parsePreferences('{"volume":"loud"}').volume).toBe(0.35);
  });
});
