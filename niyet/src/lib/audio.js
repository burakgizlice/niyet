// Block 5: Web Audio API three-oscillator tick sound.
//
// Fully synthesised at runtime — no audio asset files, works offline. A single
// AudioContext is lazily created and shared (stopped oscillators cannot
// restart, so we make fresh oscillator nodes per call; staggered stop() times
// let GC reclaim them — no manual disconnect needed).
//
// Audio must never crash the app: playTickSound() swallows all errors and is a
// no-op when Web Audio is unavailable (SSR / very old browsers).

// --- Tunable sound constants (ear-tune here without touching logic) ---------

// L1 — sharp click (sawtooth)
const L1_GAIN_PEAK = 0.35
const L1_FREQ_START = 1800
const L1_FREQ_END = 2400
const L1_DURATION = 0.08

// L2 — warm rising tone (sine)
const L2_GAIN_PEAK = 0.22
const L2_FREQ_START = 880
const L2_FREQ_END = 1320
const L2_DURATION = 0.3

// L3 — high sparkle (triangle)
const L3_GAIN_PEAK = 0.12
const L3_FREQ_START = 3200
const L3_FREQ_END = 4200
const L3_DURATION = 0.35

// Tiny attack to avoid a DC click at note onset, and a small epsilon floor so
// the decay never ramps to exactly 0 (some implementations warn on 0).
const ATTACK = 0.005
const EPSILON = 0.0001

// --- Shared context singleton ----------------------------------------------

let _ctx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!_ctx) {
    _ctx = new Ctor()
  }
  if (_ctx.state === 'suspended') {
    // Fire-and-forget: resuming may be a no-op outside a gesture, that's fine.
    _ctx.resume()
  }
  return _ctx
}

// Must be invoked from a real user-gesture handler. Resumes the context and
// plays a zero-length buffer — the classic iOS Safari autoplay unlock.
export function unlockAudio() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const source = ctx.createBufferSource()
    source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    source.connect(ctx.destination)
    source.start(0)
    source.stop(0)
  } catch {
    // swallow — unlock failures must never surface
  }
}

// Builds one osc -> gain -> destination chain with a frequency sweep and a
// short attack/decay gain envelope.
function playLayer(ctx, now, type, freqStart, freqEnd, peak, duration) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freqStart, now)
  osc.frequency.linearRampToValueAtTime(freqEnd, now + duration)

  gain.gain.setValueAtTime(EPSILON, now)
  gain.gain.linearRampToValueAtTime(peak, now + ATTACK)
  gain.gain.linearRampToValueAtTime(EPSILON, now + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  // small tail past the envelope so the ramp finishes cleanly
  osc.stop(now + duration + 0.005)
}

// Synchronous, returns void. Fires the three layered oscillators at once.
export function playTickSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    playLayer(ctx, now, 'sawtooth', L1_FREQ_START, L1_FREQ_END, L1_GAIN_PEAK, L1_DURATION)
    playLayer(ctx, now, 'sine', L2_FREQ_START, L2_FREQ_END, L2_GAIN_PEAK, L2_DURATION)
    playLayer(ctx, now, 'triangle', L3_FREQ_START, L3_FREQ_END, L3_GAIN_PEAK, L3_DURATION)
  } catch {
    // swallow — audio must never crash the app
  }
}
