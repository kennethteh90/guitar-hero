/**
 * Adjusts a chart's note list based on difficulty.
 * Returns a shallow copy with a new notes array — does not mutate the original.
 *
 * Easy  : strip all hold durations (tap-only) + thin to ~50% of notes
 * Normal: pass through unchanged
 * Hard  : keep holds, insert fills in large gaps
 */
export function applyDifficulty(chart, difficultyKey) {
  if (difficultyKey === 'normal') return chart;

  const sorted = [...chart.notes].sort((a, b) => a.time - b.time);

  if (difficultyKey === 'easy') {
    // Convert all holds to taps
    const tapOnly = sorted.map(n => n.duration > 0 ? { time: n.time, lane: n.lane } : n);
    // Remove chords: skip notes within 50ms of the previous
    const deChorded = [];
    let lastTime = -1;
    for (const note of tapOnly) {
      if (note.time - lastTime >= 0.05) { deChorded.push(note); lastTime = note.time; }
    }
    // Keep every other note
    return { ...chart, notes: deChorded.filter((_, i) => i % 2 === 0) };
  }

  if (difficultyKey === 'hard') {
    const hardNotes = [...sorted];
    let fillCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].time - sorted[i].time;
      if (gap >= 0.28 && gap <= 0.75 && fillCount % 3 !== 2) {
        const midTime = sorted[i].time + gap / 2;
        let lane = (sorted[i].lane + 1) % 4;
        if (lane === sorted[i + 1].lane) lane = (lane + 2) % 4;
        hardNotes.push({ time: parseFloat(midTime.toFixed(3)), lane });
      }
      fillCount++;
    }
    hardNotes.sort((a, b) => a.time - b.time);
    return { ...chart, notes: hardNotes };
  }

  return chart;
}
