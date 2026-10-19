import { createStore } from "../storage";

/** Generated ambient noise via Web Audio — no files, no network. */

export type AmbientKind = "rain" | "brown" | "pink" | "white" | "ocean";

export const AMBIENT_KINDS: { id: AmbientKind; label: string; emoji: string }[] = [
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "brown", label: "Brown", emoji: "🟤" },
  { id: "pink", label: "Pink", emoji: "🌸" },
  { id: "white", label: "White", emoji: "⚪" },
];

export type AmbientState = { enabled: boolean; kind: AmbientKind; volume: number };

export const ambientStore = createStore<AmbientState>("ambient", { enabled: false, kind: "rain", volume: 0.4 });

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let graph: { stop: () => void } | null = null;
let currentKind: AmbientKind | null = null;

function noiseBuffer(ac: AudioContext, kind: "white" | "pink" | "brown") {
  const length = ac.sampleRate * 4;
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") data[i] = white * 0.35;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  return buffer;
}

function build(ac: AudioContext, out: AudioNode, kind: AmbientKind) {
  const src = ac.createBufferSource();
  src.loop = true;
  const nodes: AudioNode[] = [];
  const oscs: OscillatorNode[] = [];

  if (kind === "rain") {
    src.buffer = noiseBuffer(ac, "pink");
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6000;
    const gain = ac.createGain();
    gain.gain.value = 0.8;
    // Gentle flutter like drops on a window.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.35;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(hp).connect(lp).connect(gain).connect(out);
    nodes.push(hp, lp, gain, lfoGain);
    oscs.push(lfo);
  } else if (kind === "ocean") {
    src.buffer = noiseBuffer(ac, "brown");
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const gain = ac.createGain();
    gain.gain.value = 0.55;
    // Slow swell of waves.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(lp).connect(gain).connect(out);
    nodes.push(lp, gain, lfoGain);
    oscs.push(lfo);
  } else {
    src.buffer = noiseBuffer(ac, kind);
    src.connect(out);
  }

  src.start();
  oscs.forEach((o) => o.start());
  return {
    stop() {
      try {
        src.stop();
        oscs.forEach((o) => o.stop());
      } catch {
        /* already stopped */
      }
      src.disconnect();
      nodes.forEach((n) => n.disconnect());
    },
  };
}

/** Bring the audio graph in line with the stored state. Must first run inside a user gesture. */
export function syncAmbient(state: AmbientState) {
  if (typeof window === "undefined") return;
  if (!state.enabled) {
    if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => {
      if (!ambientStore.get().enabled) {
        graph?.stop();
        graph = null;
        currentKind = null;
        ctx?.suspend();
      }
    }, 600);
    return;
  }
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  ctx.resume();
  if (currentKind !== state.kind) {
    graph?.stop();
    graph = build(ctx, master!, state.kind);
    currentKind = state.kind;
  }
  master!.gain.setTargetAtTime(state.volume * 0.6, ctx.currentTime, 0.2);
}

export const ambientActions = {
  toggle() {
    ambientStore.set((s) => ({ ...s, enabled: !s.enabled }));
    syncAmbient(ambientStore.get());
  },
  setKind(kind: AmbientKind) {
    ambientStore.set((s) => ({ ...s, kind, enabled: true }));
    syncAmbient(ambientStore.get());
  },
  setVolume(volume: number) {
    ambientStore.set((s) => ({ ...s, volume }));
    syncAmbient(ambientStore.get());
  },
};
