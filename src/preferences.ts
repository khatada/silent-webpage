export interface Preferences { volume: number; reduceMotion: boolean }
export const defaultPreferences: Preferences = { volume: 0.35, reduceMotion: false };
export function parsePreferences(raw: string | null): Preferences {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    if (!parsed || typeof parsed !== 'object') return { ...defaultPreferences };
    const value = parsed as Record<string, unknown>;
    return {
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.max(0, Math.min(1, value.volume)) : defaultPreferences.volume,
      reduceMotion: typeof value.reduceMotion === 'boolean' ? value.reduceMotion : false,
    };
  } catch { return { ...defaultPreferences }; }
}
