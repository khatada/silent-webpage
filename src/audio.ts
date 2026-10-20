export type SoundMode = 'off' | 'city' | 'ambient';

interface Layer {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
}

export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** All sounds are synthesized locally. No context exists until an explicit play action. */
export class Soundscape {
  private context?: AudioContext;
  private output?: GainNode;
  private layer?: Layer;
  private mode: SoundMode = 'off';
  private volume = 0.35;
  private destroyed = false;
  private revision = 0;
  private readonly retiring = new Set<Layer>();

  async setMode(mode: SoundMode): Promise<void> {
    if (this.destroyed) return;
    const revision = ++this.revision;
    if (mode === 'off') {
      if (this.layer && this.context) this.retire(this.layer, this.context);
      this.layer = undefined;
      this.mode = mode;
      return;
    }
    const context = this.getContext();
    await context.resume();
    if (this.destroyed || revision !== this.revision) return;
    if (this.mode === mode && this.layer) return;
    const next = this.createLayer(context, mode);
    if (this.layer) this.retire(this.layer, context);
    this.layer = next;
    this.mode = mode;
  }

  setVolume(value: number): void {
    this.volume = clampVolume(value);
    if (this.context && this.output) {
      this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.08);
    }
  }

  async suspend(): Promise<void> {
    if (this.context && this.context.state !== 'closed') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (!this.destroyed && this.context && this.mode !== 'off') await this.context.resume();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.revision++;
    for (const layer of [...this.retiring, ...(this.layer ? [this.layer] : [])]) {
      for (const source of layer.sources) {
        source.onended = null;
        source.stop();
      }
      for (const node of layer.nodes) node.disconnect();
    }
    this.retiring.clear();
    this.layer = undefined;
    this.output?.disconnect();
    if (this.context && this.context.state !== 'closed') void this.context.close();
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = this.volume;
      this.output.connect(this.context.destination);
    }
    return this.context;
  }

  private retire(layer: Layer, context: AudioContext): void {
    const now = context.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setTargetAtTime(0, now, 0.35);
    this.retiring.add(layer);
    let pending = layer.sources.length;
    for (const source of layer.sources) {
      source.onended = () => {
        if (--pending === 0) {
          for (const node of layer.nodes) node.disconnect();
          this.retiring.delete(layer);
        }
      };
      source.stop(now + 2.5);
    }
  }

  private createLayer(context: AudioContext, mode: Exclude<SoundMode, 'off'>): Layer {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(this.output!);
    gain.gain.setTargetAtTime(1, context.currentTime, 1.2);
    const layer: Layer = { gain, sources: [], nodes: [gain] };
    if (mode === 'city') {
      // Filtered, slowly swelling noise suggests distant traffic, without sharp transients.
      const buffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 1937;
      let previous = 0;
      for (let index = 0; index < samples.length; index++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        previous = (previous + ((seed / 4294967296) * 2 - 1) * 0.02) / 1.02;
        samples[index] = previous * 3;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      filter.Q.value = 0.4;
      const level = context.createGain();
      level.gain.value = 0.65;
      source.connect(filter).connect(level).connect(gain);
      const drift = context.createOscillator();
      drift.frequency.value = 0.037;
      const depth = context.createGain();
      depth.gain.value = 0.22;
      drift.connect(depth).connect(level.gain);
      layer.sources.push(source, drift);
      layer.nodes.push(source, filter, level, drift, depth);
    } else {
      // A suspended D minor ninth voicing, with no beat or sudden note attacks.
      for (const [index, frequency] of [146.83, 220, 261.63, 329.63, 440].entries()) {
        const tone = context.createOscillator();
        tone.type = 'sine';
        tone.frequency.value = frequency;
        tone.detune.value = index % 2 === 0 ? -3 : 3;
        const level = context.createGain();
        level.gain.value = 0.065;
        tone.connect(level).connect(gain);
        const drift = context.createOscillator();
        drift.frequency.value = 0.013 + index * 0.004;
        const depth = context.createGain();
        depth.gain.value = 0.024;
        drift.connect(depth).connect(level.gain);
        layer.sources.push(tone, drift);
        layer.nodes.push(tone, level, drift, depth);
      }
    }
    for (const source of layer.sources) source.start();
    return layer;
  }
}
