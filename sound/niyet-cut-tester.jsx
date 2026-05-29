import { useState, useRef } from "react";

const GOLD = "#E8A23D";
const GOLD_LT = "#F2C661";
const CREAM = "#FFF7E0";

// ---------- synthesized sound (no files, zero latency) ----------
function makePlayer() {
  let ctx = null;
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  return function play({ volume = 0.9, variant = "clean" } = {}) {
    const c = audio();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = volume;
    master.connect(c.destination);

    // 1) blade swoosh — white noise through sweeping bandpass
    const dur = 0.3;
    const frames = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = variant === "shimmer" ? 6 : 5;
    bp.frequency.setValueAtTime(variant === "resolve" ? 550 : 650, t0);
    bp.frequency.exponentialRampToValueAtTime(variant === "shimmer" ? 3200 : 2800, t0 + dur);
    const swG = c.createGain();
    swG.gain.setValueAtTime(0.0001, t0);
    swG.gain.linearRampToValueAtTime(0.5, t0 + 0.04);
    swG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    noise.connect(bp).connect(swG).connect(master);
    noise.start(t0); noise.stop(t0 + dur);

    // 2) body thump for weight
    const cut = t0 + 0.3;
    const body = c.createOscillator();
    const bodyG = c.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(130, cut);
    body.frequency.exponentialRampToValueAtTime(90, cut + 0.08);
    bodyG.gain.setValueAtTime(0.5, cut);
    bodyG.gain.exponentialRampToValueAtTime(0.001, cut + 0.09);
    body.connect(bodyG).connect(master);
    body.start(cut); body.stop(cut + 0.1);

    // 3) bright gleam — the payoff
    const gleam = cut + 0.01;
    const tones = variant === "resolve" ? [1318, 1760] : [1568, 2093];
    tones.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const start = gleam + (variant === "resolve" ? i * 0.09 : 0);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.55 - i * 0.12, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      o.connect(g).connect(master);
      o.start(start); o.stop(start + 0.42);
    });

    // 4) sparkle on top
    [4186, 5274].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const start = gleam + 0.02;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.16 - i * 0.04, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      o.connect(g).connect(master);
      o.start(start); o.stop(start + 0.18);
    });

    setTimeout(() => { try { master.disconnect(); } catch {} }, 900);
  };
}

const VARIANTS = [
  { id: "clean", name: "Clean Cut", desc: "Swoosh + low thump + bright bell. Crisp, weighty, repeatable. The everyday pick." },
  { id: "shimmer", name: "Shimmer Steel", desc: "Metallic inharmonic shimmer with a longer tail. More ethereal, more blade." },
  { id: "resolve", name: "Resolve", desc: "Lands on a warm rising two-note phrase. Musical — save it for chain completion." },
];

export default function CutTester() {
  const [variant, setVariant] = useState("clean");
  const [vol, setVol] = useState(0.9);
  const [k, setK] = useState(0);
  const [done, setDone] = useState(false);
  const playRef = useRef(null);
  if (!playRef.current) playRef.current = makePlayer();

  const fire = () => {
    playRef.current({ volume: vol, variant });
    setK((x) => x + 1);
    setDone(true);
    setTimeout(() => setDone(false), 1100);
  };

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "radial-gradient(120% 90% at 30% 10%, #114a33 0%, #0c3b29 45%, #082a1d 100%)", minHeight: "100vh", color: "#e8e0cf", padding: "28px 18px 40px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes draw { to { stroke-dashoffset: 0; } }
        @keyframes spark { 0%{opacity:1;transform:scale(1.6);} 100%{opacity:0;transform:scale(.5);} }
        @keyframes checkpop { 0%{transform:scale(.4);} 60%{transform:scale(1.15);} 100%{transform:scale(1);} }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, letterSpacing: 4, textTransform: "uppercase", color: "#d8b15a" }}>calligraphic cut · sound test</div>
        <div style={{ fontSize: 12, color: "#7fae93", marginTop: 4, fontStyle: "italic" }}>tap the task — sound + stroke fire together</div>
      </div>

      {/* tap target */}
      <div
        onClick={fire}
        style={{ position: "relative", maxWidth: 360, margin: "18px auto 0", height: 130, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderRadius: 18, cursor: "pointer", userSelect: "none", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.18))", border: "1px solid rgba(216,177,90,0.18)", overflow: "hidden" }}
      >
        <div key={k + "c"} style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${done ? GOLD : "rgba(216,177,90,0.4)"}`, background: done ? "rgba(232,162,61,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: done ? "checkpop .3s ease-out" : "none" }}>
          {done && <svg width="18" height="18" viewBox="0 0 20 20"><path d="M4 10 L8 14 L16 6" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        <span style={{ fontSize: 19, color: done ? "#9bbfa8" : CREAM, transition: "color .3s" }}>Make wudhu</span>

        {/* the calligraphic cut stroke */}
        {done && (
          <svg key={k} width="100%" height="60" style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} viewBox="0 0 320 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="blade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#b8860b" /><stop offset="0.5" stopColor="#f2c661" /><stop offset="1" stopColor="#fff7e0" />
              </linearGradient>
            </defs>
            <path d="M 14,34 Q 90,22 170,30 Q 250,38 308,26" fill="none" stroke="url(#blade)" strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: 320, strokeDashoffset: 320, animation: "draw 0.4s cubic-bezier(.4,0,.2,1) forwards" }} />
            <circle cx="308" cy="26" r="3" fill={CREAM} style={{ opacity: 0, animation: "spark 0.4s ease-out 0.34s forwards" }} />
          </svg>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#5e8a72" }}>tap again to replay</div>

      {/* variant picker */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 24, maxWidth: 460, marginInline: "auto" }}>
        {VARIANTS.map((v) => (
          <button key={v.id} onClick={() => setVariant(v.id)} style={{ background: variant === v.id ? "linear-gradient(180deg,#e8a23d,#d4892b)" : "transparent", color: variant === v.id ? "#3a2206" : "#cdbf9b", border: variant === v.id ? "none" : "1px solid rgba(216,177,90,0.25)", padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: variant === v.id ? 700 : 400 }}>{v.name}</button>
        ))}
      </div>

      <div style={{ maxWidth: 380, margin: "18px auto 0", textAlign: "center", fontSize: 13.5, color: "#9bbfa8", lineHeight: 1.6, fontStyle: "italic", minHeight: 44 }}>
        {VARIANTS.find((v) => v.id === variant)?.desc}
      </div>

      {/* volume */}
      <div style={{ maxWidth: 300, margin: "20px auto 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "#7fae93" }}>vol</span>
        <input type="range" min="0" max="1" step="0.05" value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} style={{ flex: 1, accentColor: GOLD }} />
        <span style={{ fontSize: 12, color: "#cdbf9b", width: 32, textAlign: "right" }}>{Math.round(vol * 100)}</span>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "#5e8a72", textAlign: "center", lineHeight: 1.6 }}>
        If you hear nothing: check your device isn't on silent, and make sure you've<br />tapped at least once (browsers unlock audio only after a tap).
      </div>
    </div>
  );
}
