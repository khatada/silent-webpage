import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampVolume, Soundscape } from './audio';

const parameter = () => ({ value: 0, setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });

function makeContext() {
  const sources: ReturnType<typeof makeNode>[] = [];
  function makeNode() {
    const node = {
      gain: parameter(), frequency: parameter(), Q: parameter(), detune: parameter(),
      connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    node.connect.mockReturnValue(node);
    return node;
  }
  const source = () => {
    const node = makeNode();
    sources.push(node);
    return node;
  };
  return {
    currentTime: 0, sampleRate: 10, state: 'running', destination: makeNode(), sources,
    createGain: vi.fn(makeNode), createBiquadFilter: vi.fn(makeNode),
    createOscillator: vi.fn(source), createBufferSource: vi.fn(source),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(80) })),
    resume: vi.fn(async () => {}), suspend: vi.fn(async () => {}), close: vi.fn(async () => {}),
  };
}

describe('Soundscape', () => {
  let context: ReturnType<typeof makeContext>;
  let sound: Soundscape;
  let constructor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    context = makeContext();
    constructor = vi.fn(function () { return context; });
    vi.stubGlobal('AudioContext', constructor);
    sound = new Soundscape();
  });
  afterEach(() => { sound.destroy(); vi.unstubAllGlobals(); });

  it('does not create audio before the user requests playback', async () => {
    sound.setVolume(0.5);
    await sound.setMode('off');
    await sound.resume();
    expect(constructor).not.toHaveBeenCalled();
  });

  it('reuses the context and does not duplicate the active sound', async () => {
    await sound.setMode('city');
    const count = context.sources.length;
    await sound.setMode('city');
    expect(constructor).toHaveBeenCalledOnce();
    expect(context.sources).toHaveLength(count);
    expect(context.sources.every((node) => node.start.mock.calls.length === 1)).toBe(true);
  });

  it('fades out and releases old sources when switching sounds', async () => {
    await sound.setMode('city');
    const previous = [...context.sources];
    await sound.setMode('ambient');
    for (const node of previous) {
      expect(node.stop).toHaveBeenCalledWith(2.5);
      node.onended?.();
    }
    expect(previous.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it('keeps only the latest choice when playback requests overlap', async () => {
    let resolve!: () => void;
    context.resume.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
    const pending = sound.setMode('city');
    await sound.setMode('off');
    resolve();
    await pending;
    expect(context.sources).toHaveLength(0);
  });

  it('suspends sound and closes its context during cleanup', async () => {
    await sound.setMode('ambient');
    await sound.suspend();
    expect(context.suspend).toHaveBeenCalledOnce();
    sound.destroy();
    expect(context.close).toHaveBeenCalledOnce();
    await sound.setMode('city');
    expect(constructor).toHaveBeenCalledOnce();
  });
});

describe('volume boundaries', () => {
  it('clamps invalid and out-of-range values to a safe range', () => {
    expect([-1, 0.4, 2, NaN, Infinity].map(clampVolume)).toEqual([0, 0.4, 1, 0, 0]);
  });
});
