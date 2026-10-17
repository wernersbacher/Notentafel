// Klangerzeugung mit Web Audio: Glockenspiel für die bunten Punkte, Klanghölzer für eigenständige Notenzeichen,
// Klavier für das Notenblatt
let audio = null;

// Liefert den AudioContext (beim ersten Mal erzeugt) oder null, wenn der Browser kein Web Audio kann
export function audioCtx() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

// Ein Sinuston mit Anschlag: steigt in att Sekunden auf amp und klingt mit der Zeitkonstante tau aus.
// damp (optional): ab dieser Zeit abdämpfen, mit der Zeitkonstante rel. stop: wann der Oszillator endet.
function partial(out, freq, t0, amp, att, tau, damp, stop, rel = 0.04) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(amp, t0 + att);
  g.gain.setTargetAtTime(0.0001, t0 + att, tau);
  if (damp) g.gain.setTargetAtTime(0.0001, damp, rel);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(stop);
}

// Rauschen für den Anschlag der Klanghölzer, einmal erzeugt
let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    const n = Math.round(audio.sampleRate * 0.03);
    noiseBuf = audio.createBuffer(1, n, audio.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Klanghölzer: kurzer, heller, trockener Ton mit hölzernem Anschlag
export function clave(out, t0) {
  partial(out, 2400, t0, 0.9, 0.001, 0.018, 0, t0 + 0.12);
  partial(out, 4150, t0, 0.12, 0.001, 0.008, 0, t0 + 0.06);
  const src = audio.createBufferSource(), bp = audio.createBiquadFilter(), g = audio.createGain();
  src.buffer = noise();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 2;
  g.gain.setValueAtTime(0.5, t0);
  g.gain.setTargetAtTime(0.0001, t0, 0.004);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + 0.03);
}

// Glockenspiel: eine Oktave über dem notierten Ton wie beim echten Instrument,
// mit den unharmonischen Teiltönen eines Metallstabs. Klingt natürlich aus und wird am Ende der Notenlänge
// abgedämpft, damit man lange und kurze Töne unterscheidet.
export function bell(out, freq, t0, len) {
  const f = freq * 2, damp = t0 + len, stop = damp + 0.3;
  partial(out, f, t0, 0.45, 0.003, 0.7, damp, stop);
  partial(out, f * 2.76, t0, 0.1, 0.002, 0.18, damp, stop);
  partial(out, f * 5.4, t0, 0.04, 0.001, 0.06, damp, stop);
}

// Klavierähnlich: kräftiger Anschlag, die Obertöne klingen schneller aus als der Grundton, hohe Töne kürzer als tiefe.
// Die Obertöne sind leicht gestreckt wie bei einer Saite, ein zweiter, minimal verstimmter Grundton macht den Klang voller.
// Am Ende der Notenlänge wird abgedämpft wie beim Loslassen der Taste.
export function piano(out, freq, t0, len) {
  const damp = t0 + Math.max(len, 0.1), stop = damp + 0.6, k = Math.min(1.6, Math.max(0.5, (440 / freq) ** 0.6));
  [[1, 0.36, 1.8], [2, 0.18, 1.0], [3, 0.08, 0.6], [4, 0.045, 0.4], [5, 0.025, 0.28], [6, 0.014, 0.2]].forEach(([n, amp, tau]) => {
    partial(out, freq * n * (1 + 0.0003 * n * n), t0, amp, 0.004, tau * k, damp, stop, 0.08);
  });
  partial(out, freq * 1.0012, t0, 0.14, 0.004, 1.8 * k, damp, stop, 0.08);
}
