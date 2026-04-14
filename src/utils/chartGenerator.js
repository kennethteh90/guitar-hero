import { NUM_LANES } from '../constants.js';

/**
 * Convert beat times to a chart. Assigns lanes with alternating/weighted
 * patterns, and converts some single-beat spans to hold notes.
 */
export function generateChart(beats, audioBuffer, title = 'Uploaded Song', artist = 'Unknown') {
  const duration = audioBuffer ? audioBuffer.duration : (beats[beats.length - 1] + 2);
  const notes = [];

  let bpm = 120;
  if (beats.length > 2) {
    const intervals = [];
    for (let i = 1; i < beats.length; i++) intervals.push(beats[i] - beats[i - 1]);
    intervals.sort((a, b) => a - b);
    bpm = Math.round(60 / intervals[Math.floor(intervals.length / 2)]);
  }

  let lastLane = -1;
  let lastTime = -1;

  beats.forEach((time, i) => {
    if (time - lastTime < 0.15) return;

    const isStrong   = i % 4 === 0;
    const isHalfBeat = i % 2 === 0;

    if (isStrong && Math.random() < 0.25) {
      // Chord on strong beats
      const lane1 = Math.floor(Math.random() * NUM_LANES);
      const lane2 = (lane1 + 2) % NUM_LANES;
      notes.push({ time: parseFloat(time.toFixed(3)), lane: lane1 });
      notes.push({ time: parseFloat(time.toFixed(3)), lane: lane2 });
      lastLane = lane2;
    } else {
      let lane;
      if (lastLane < 0) {
        lane = Math.floor(Math.random() * NUM_LANES);
      } else if (isHalfBeat) {
        const wasLeft = lastLane < 2;
        const half = wasLeft ? [2, 3] : [0, 1];
        lane = half[Math.floor(Math.random() * 2)];
      } else {
        do { lane = Math.floor(Math.random() * NUM_LANES); }
        while (lane === lastLane && Math.random() < 0.7);
      }
      notes.push({ time: parseFloat(time.toFixed(3)), lane });
      lastLane = lane;
    }
    lastTime = time;
  });

  notes.sort((a, b) => a.time - b.time);

  // --- Convert some notes to holds ---
  // For each note, look at the next note in the same lane.
  // If the gap is 0.3–0.75s, convert with ~25% probability.
  const laneNextIndex = new Array(NUM_LANES).fill(-1);
  const result = [];

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n._used) continue; // already consumed as a hold tail

    // Find next note in same lane
    let nextSameLane = -1;
    for (let j = i + 1; j < notes.length; j++) {
      if (notes[j].lane === n.lane && !notes[j]._used) {
        nextSameLane = j;
        break;
      }
    }

    if (nextSameLane !== -1) {
      const gap = notes[nextSameLane].time - n.time;
      if (gap >= 0.3 && gap <= 0.75 && Math.random() < 0.25) {
        // Make this note a hold ending just before the next same-lane note
        const holdDuration = parseFloat((gap * 0.85).toFixed(3));
        result.push({ time: n.time, lane: n.lane, duration: holdDuration });
        notes[nextSameLane]._used = true; // consume the "tail" note
        continue;
      }
    }

    result.push({ time: n.time, lane: n.lane, duration: 0 });
  }

  result.sort((a, b) => a.time - b.time);

  return { title, artist, bpm, duration: parseFloat(duration.toFixed(2)), notes: result };
}
