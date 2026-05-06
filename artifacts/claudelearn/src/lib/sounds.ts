const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sounds = {
  hover() { tone(880, 0.05, "sine", 0.04); },
  click() {
    tone(660, 0.07, "sine", 0.08);
    setTimeout(() => tone(880, 0.05, "sine", 0.06), 30);
  },
  success() {
    tone(523, 0.1, "sine", 0.1);
    setTimeout(() => tone(659, 0.1, "sine", 0.1), 80);
    setTimeout(() => tone(784, 0.2, "sine", 0.1), 160);
  },
  error() { tone(220, 0.2, "sawtooth", 0.06); },
  flip() { tone(440, 0.08, "triangle", 0.07); },
  correct() {
    tone(600, 0.08, "sine", 0.1);
    setTimeout(() => tone(900, 0.12, "sine", 0.08), 60);
  },
  wrong() { tone(200, 0.15, "square", 0.05); },
  timerEnd() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        tone(523, 0.15, "sine", 0.12);
        setTimeout(() => tone(659, 0.15, "sine", 0.12), 100);
      }, i * 350);
    }
  },
  send() { tone(700, 0.06, "sine", 0.06); },
  receive() { tone(500, 0.05, "sine", 0.04); },
};
