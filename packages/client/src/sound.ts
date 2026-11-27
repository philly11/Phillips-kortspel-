/**
 * Every sound in the game, made in code with the browser's Web Audio API. No sound files.
 *
 * How it works, in short: we build tiny "instruments" from two ingredients and shape them
 * with a volume envelope (loud at the start, fading out):
 *   - an OSCILLATOR: a pure tone at a pitch (a ding, a boom)
 *   - NOISE: random hiss, filtered to sound like a slap, a knock or a crack
 *
 * Everything browser-specific stays in this file (an adapter), so an Electron build
 * or real sound files could replace it later without touching the rest of the game.
 */

export type SoundName = 'select' | 'play' | 'slam' | 'pass' | 'chop' | 'turn' | 'chip' | 'pot';

/** Overall loudness, 0 to 1. */
const MASTER_VOLUME = 0.5;
const MUTE_KEY = 'tienlen.muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = loadMuted();

/** Play a sound now (unless muted, or the browser hasn't allowed audio yet). */
export function playSound(name: SoundName, delay = 0): void {
  if (muted) return;
  const audio = getAudio();
  if (audio === null) return;
  // Browsers keep audio paused until the player has clicked or typed on the page
  // (so websites can't blast noise at you). By the time a game runs, they have.
  if (audio.context.state === 'suspended') void audio.context.resume();
  SOUNDS[name](audio.context, audio.output, audio.context.currentTime + delay);
}

export function isMuted(): boolean {
  return muted;
}

/** Turn sound off or on. Remembered in this browser for next time. */
export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage blocked: the setting just isn't remembered.
  }
}

// ── The instruments ───────────────────────────────────────────────────────

/** One sound: draws itself into `out`, starting at time `at` (in seconds). */
type Recipe = (ctx: BaseAudioContext, out: AudioNode, at: number) => void;

/** The recipe for every sound. Exported so a test page can render them offline. */
export const SOUNDS: Record<SoundName, Recipe> = {
  // A tiny tick when you pick a card up.
  select: (ctx, out, at) => {
    noise(ctx, out, at, { duration: 0.025, volume: 0.25, filter: 'highpass', frequency: 4000 });
  },

  // A card slapped onto the felt: a short filtered hiss plus a soft low thump.
  play: (ctx, out, at) => {
    noise(ctx, out, at, { duration: 0.09, volume: 0.6, filter: 'bandpass', frequency: 1800, q: 0.8 });
    tone(ctx, out, at, { type: 'sine', from: 190, to: 120, duration: 0.07, volume: 0.35 });
  },

  // SLAM: a heavier, darker hit with a booming drop.
  slam: (ctx, out, at) => {
    noise(ctx, out, at, { duration: 0.22, volume: 0.9, filter: 'lowpass', frequency: 1200 });
    tone(ctx, out, at, { type: 'sine', from: 140, to: 45, duration: 0.3, volume: 0.9 });
  },

  // Pass: two soft knocks on the table.
  pass: (ctx, out, at) => {
    for (const offset of [0, 0.11]) {
      tone(ctx, out, at + offset, { type: 'triangle', from: 260, to: 180, duration: 0.06, volume: 0.35 });
      noise(ctx, out, at + offset, { duration: 0.03, volume: 0.15, filter: 'lowpass', frequency: 900 });
    }
  },

  // CHẶT!: a sharp crack, a deep boom, and a short metallic ring.
  chop: (ctx, out, at) => {
    noise(ctx, out, at, { duration: 0.06, volume: 1, filter: 'highpass', frequency: 1500 });
    tone(ctx, out, at, { type: 'sine', from: 110, to: 38, duration: 0.45, volume: 1 });
    tone(ctx, out, at + 0.02, { type: 'square', from: 660, to: 640, duration: 0.25, volume: 0.12 });
    tone(ctx, out, at + 0.02, { type: 'square', from: 990, to: 955, duration: 0.2, volume: 0.08 });
  },

  // Your turn: a friendly two-note "ding-ding" going up.
  turn: (ctx, out, at) => {
    tone(ctx, out, at, { type: 'sine', from: 880, to: 880, duration: 0.18, volume: 0.35 });
    tone(ctx, out, at + 0.12, { type: 'sine', from: 1320, to: 1320, duration: 0.3, volume: 0.35 });
  },

  // A chip: two quick bright clinks.
  chip: (ctx, out, at) => {
    tone(ctx, out, at, { type: 'triangle', from: 2600, to: 2500, duration: 0.05, volume: 0.25 });
    tone(ctx, out, at + 0.045, { type: 'triangle', from: 3300, to: 3200, duration: 0.07, volume: 0.2 });
  },

  
  // Winning the pot: a cascade of chips tumbling into a pile.
  pot: (ctx, out, at) => {
    const pitches = [2300, 2900, 2500, 3400, 2700, 3100, 2400, 3600];
    pitches.forEach((pitch, index) => {
      const when = at + index * 0.055;
      tone(ctx, out, when, { type: 'triangle', from: pitch, to: pitch * 0.96, duration: 0.07, volume: 0.22 });
    });
  },
};

// ── Building blocks ───────────────────────────────────────────────────────

interface ToneOptions {
  readonly type: OscillatorType;
  /** Pitch at the start and at the end, in Hz (it slides between them). */
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  readonly volume: number;
}

/** A tone that slides from one pitch to another and fades out. */
function tone(ctx: BaseAudioContext, out: AudioNode, at: number, o: ToneOptions): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = o.type;
  oscillator.frequency.setValueAtTime(o.from, at);
  oscillator.frequency.exponentialRampToValueAtTime(o.to, at + o.duration);
  oscillator.connect(envelope(ctx, out, at, o.duration, o.volume));
  oscillator.start(at);
  oscillator.stop(at + o.duration);
}

interface NoiseOptions {
  readonly duration: number;
  readonly volume: number;
  readonly filter: BiquadFilterType;
  readonly frequency: number;
  readonly q?: number;
}

/** A burst of filtered hiss that fades out. */
function noise(ctx: BaseAudioContext, out: AudioNode, at: number, o: NoiseOptions): void {
  const length = Math.ceil(ctx.sampleRate * o.duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Math.random is fine here: this is sound, not game logic.
    samples[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.frequency.value = o.frequency;
  filter.Q.value = o.q ?? 1;
  source.connect(filter);
  filter.connect(envelope(ctx, out, at, o.duration, o.volume));
  source.start(at);
  source.stop(at + o.duration);
}

/** A volume shape: jump up almost instantly, then fade away over `duration`. */
function envelope(ctx: BaseAudioContext, out: AudioNode, at: number, duration: number, volume: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  gain.connect(out);
  return gain;
}

/** The one shared audio context, created the first time a sound is needed. */
function getAudio(): { context: AudioContext; output: AudioNode } | null {
  if (typeof AudioContext === 'undefined') return null; // very old browser: no sound
  if (context === null || master === null) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  return { context, output: master };
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}