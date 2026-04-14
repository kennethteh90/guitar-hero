/**
 * Beat detection using OfflineAudioContext + onset strength envelope.
 *
 * Pipeline:
 *   1. Decode audio
 *   2. Bandpass filter 40-200Hz (kick / bass transients)
 *   3. Compute RMS energy per 10ms hop
 *   4. Onset strength = max(0, E[t] - E[t-1])  ← only energy increases
 *   5. Local adaptive threshold (windowed median × factor)
 *   6. Peak-pick with 200ms minimum spacing
 *
 * Using onset strength (first difference) rather than absolute energy means
 * we detect the *attack* of each beat, not its sustain — which is what the
 * ear hears as "the beat".  Local thresholding handles songs that change
 * dynamics between verse and chorus.
 */
export default class BeatDetector {
  static async detect(arrayBuffer) {
    // --- 1. Decode ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      audioCtx.close();
    }

    const sampleRate = audioBuffer.sampleRate;
    const duration   = audioBuffer.duration;

    // --- 2. Bandpass filter 40–200 Hz in OfflineAudioContext ---
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(sampleRate * duration),
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // High-pass at 40Hz to remove DC / rumble
    const hpf = offlineCtx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 40;
    hpf.Q.value = 0.7;

    // Low-pass at 200Hz to keep only kick/bass transients
    const lpf = offlineCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 200;
    lpf.Q.value = 0.7;

    source.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const data = rendered.getChannelData(0);

    // --- 3. RMS energy envelope (10ms hops, 20ms windows) ---
    const windowSamples = Math.floor(sampleRate * 0.02); // 20ms
    const hopSamples    = Math.floor(sampleRate * 0.01); // 10ms
    const energies = [];

    for (let i = 0; i + windowSamples < data.length; i += hopSamples) {
      let sum = 0;
      for (let j = 0; j < windowSamples; j++) {
        const s = data[i + j];
        sum += s * s;
      }
      energies.push(Math.sqrt(sum / windowSamples));
    }

    // --- 4. Onset strength: half-wave rectified first difference ---
    const onset = new Float32Array(energies.length);
    for (let i = 1; i < energies.length; i++) {
      onset[i] = Math.max(0, energies[i] - energies[i - 1]);
    }

    // --- 5. Local adaptive threshold ---
    // For each frame, threshold = median of onset in ±1.5s window × 1.5
    const halfWindowFrames = Math.ceil(1.5 / (hopSamples / sampleRate));
    const threshold = new Float32Array(onset.length);

    for (let i = 0; i < onset.length; i++) {
      const lo = Math.max(0, i - halfWindowFrames);
      const hi = Math.min(onset.length - 1, i + halfWindowFrames);
      const slice = Array.from(onset.subarray(lo, hi + 1)).sort((a, b) => a - b);
      const median = slice[Math.floor(slice.length / 2)];
      threshold[i] = median * 1.5;
    }

    // --- 6. Peak-pick with 200ms minimum spacing ---
    const minSpacing = Math.ceil(0.2 / (hopSamples / sampleRate));
    const beats = [];
    let lastPeak = -minSpacing;

    for (let i = 1; i < onset.length - 1; i++) {
      if (
        onset[i] > threshold[i] &&
        onset[i] >= onset[i - 1] &&
        onset[i] >= onset[i + 1] &&
        i - lastPeak >= minSpacing
      ) {
        // Sub-frame interpolation: parabolic peak refinement
        const denom = onset[i - 1] - 2 * onset[i] + onset[i + 1];
        const fracOffset = denom !== 0 ? 0.5 * (onset[i - 1] - onset[i + 1]) / denom : 0;
        const timeSec = ((i + fracOffset) * hopSamples) / sampleRate;
        beats.push(parseFloat(timeSec.toFixed(3)));
        lastPeak = i;
      }
    }

    return { beats, audioBuffer };
  }
}
