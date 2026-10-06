// A soft two-note chime for in-app alerts, made with Web Audio (no sound file).
// iOS only lets a page play sound after a tap, so the first tap anywhere unlocks it.
let ctx = null;

function context() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = context();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
}

export function playChime() {
  const c = context();
  if (!c || c.state !== 'running') return;
  const start = c.currentTime + 0.02;
  [880, 1318.5].forEach((freq, i) => {
    const t = start + i * 0.16;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}
