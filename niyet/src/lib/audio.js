// Block 5: Web Audio "Clean Cut" completion sound.
//
// Fully synthesised at runtime — no audio asset files, works offline. A single
// AudioContext is lazily created and shared; each play() builds fresh nodes
// (stopped oscillators/sources cannot restart) hung off a per-call master gain
// that is disconnected on a timer so GC can reclaim the graph.
//
// This is the "Clean Cut" variant from the sound tester: a blade swoosh
// (band-passed noise sweep) → low body thump → bright bell gleam → high
// sparkle. Paired with the calligraphic-cut stroke, both fire together on tap.
//
// Audio must never crash the app: playCutSound() swallows all errors and is a
// no-op when Web Audio is unavailable (SSR / very old browsers).

// --- Tunable sound constants (ear-tune here without touching logic) ---------

// Overall loudness of one cut (master gain). Matches the tester's default.
const MASTER_VOLUME = 0.9

// 1) Blade swoosh — white noise through a sweeping bandpass.
const SWOOSH_DURATION = 0.3
const SWOOSH_Q = 5
const SWOOSH_FREQ_START = 650
const SWOOSH_FREQ_END = 2800
const SWOOSH_GAIN_PEAK = 0.5

// 2) Body thump — gives the cut weight. Lands as the swoosh ends.
const THUMP_FREQ_START = 130
const THUMP_FREQ_END = 90
const THUMP_GAIN_PEAK = 0.5

// 3) Bright gleam — the payoff. Two stacked sine partials.
const GLEAM_TONES = [1568, 2093]

// 4) Sparkle — airy top end over the gleam.
const SPARKLE_TONES = [4186, 5274]

// Tiny attack to avoid a DC click at onset, and a small epsilon floor so the
// decay never ramps to exactly 0 (some implementations warn on 0).
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

// One sine partial with a fast attack and exponential decay, hung off `master`.
function playTone(ctx, master, freq, start, peak, attack, decay) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(EPSILON, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(EPSILON, start + decay)
  osc.connect(gain).connect(master)
  osc.start(start)
  osc.stop(start + decay + 0.02)
}

// Synchronous, returns void. Fires the layered "Clean Cut": swoosh → thump →
// gleam → sparkle, mixed through a per-call master gain.
export function playCutSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t0 = ctx.currentTime

    const master = ctx.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(ctx.destination)

    // 1) blade swoosh — white noise through a sweeping bandpass
    const frames = Math.floor(ctx.sampleRate * SWOOSH_DURATION)
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
    const channel = buf.getChannelData(0)
    for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = SWOOSH_Q
    bp.frequency.setValueAtTime(SWOOSH_FREQ_START, t0)
    bp.frequency.exponentialRampToValueAtTime(SWOOSH_FREQ_END, t0 + SWOOSH_DURATION)
    const swooshGain = ctx.createGain()
    swooshGain.gain.setValueAtTime(EPSILON, t0)
    swooshGain.gain.linearRampToValueAtTime(SWOOSH_GAIN_PEAK, t0 + 0.04)
    swooshGain.gain.exponentialRampToValueAtTime(EPSILON, t0 + SWOOSH_DURATION)
    noise.connect(bp).connect(swooshGain).connect(master)
    noise.start(t0)
    noise.stop(t0 + SWOOSH_DURATION)

    // 2) body thump for weight — lands as the swoosh ends
    const cut = t0 + SWOOSH_DURATION
    const body = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    body.type = 'sine'
    body.frequency.setValueAtTime(THUMP_FREQ_START, cut)
    body.frequency.exponentialRampToValueAtTime(THUMP_FREQ_END, cut + 0.08)
    bodyGain.gain.setValueAtTime(THUMP_GAIN_PEAK, cut)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, cut + 0.09)
    body.connect(bodyGain).connect(master)
    body.start(cut)
    body.stop(cut + 0.1)

    // 3) bright gleam — the payoff
    const gleam = cut + 0.01
    GLEAM_TONES.forEach((f, i) => {
      playTone(ctx, master, f, gleam, 0.55 - i * 0.12, 0.012, 0.4)
    })

    // 4) sparkle on top
    SPARKLE_TONES.forEach((f, i) => {
      playTone(ctx, master, f, gleam + 0.02, 0.16 - i * 0.04, 0.008, 0.16)
    })

    // Reclaim the graph once the longest tail (~0.7s) has finished.
    setTimeout(() => {
      try {
        master.disconnect()
      } catch {
        // node already gone — nothing to do
      }
    }, 900)
  } catch {
    // swallow — audio must never crash the app
  }
}
