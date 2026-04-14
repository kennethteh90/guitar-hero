/**
 * Loads and parses chart JSON. Provides note windowing for spawning.
 */
export default class ChartManager {
  constructor() {
    this.chart = null;
    this.noteIndex = 0; // cursor into sorted notes array
  }

  async load(url) {
    const res = await fetch(url);
    this.chart = await res.json();
    this.chart.notes.sort((a, b) => a.time - b.time);
    this.noteIndex = 0;
    return this.chart;
  }

  loadFromObject(chartData) {
    this.chart = chartData;
    this.chart.notes.sort((a, b) => a.time - b.time);
    this.noteIndex = 0;
    return this.chart;
  }

  reset() {
    this.noteIndex = 0;
  }

  /**
   * Returns notes whose hit time is within (currentTime, currentTime + leadTime].
   * Advances the internal cursor so we never return the same note twice.
   */
  getNotesInWindow(currentTime, leadTime) {
    const result = [];
    const notes = this.chart.notes;
    while (
      this.noteIndex < notes.length &&
      notes[this.noteIndex].time <= currentTime + leadTime
    ) {
      result.push(notes[this.noteIndex]);
      this.noteIndex++;
    }
    return result;
  }

  get totalNotes() {
    return this.chart ? this.chart.notes.length : 0;
  }
}
