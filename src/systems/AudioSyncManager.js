/**
 * Wraps Phaser sound with accurate position tracking.
 *
 * Clock: audioContext.currentTime − audioStartTime
 *   audioStartTime is captured from sound.startTime (set by Phaser INSIDE
 *   sound.play() to ctx.currentTime + audioPlayDelay) — this is the exact
 *   moment the BufferSource is scheduled, making it a sample-accurate reference.
 *   Using ctx.currentTime directly avoids drift vs. the audio thread.
 *
 * Latency: outputLatency + baseLatency are subtracted so currentTime
 *   represents the audio position being heard right now, not scheduled.
 *   (outputLatency is hardware buffer delay; baseLatency is WebAudio pipeline.)
 *
 * User offset: a calibration value (ms) stored in localStorage and added on
 *   top so players can tune sync for their specific device.
 */

const STORAGE_KEY = 'guitarHero_audioOffsetMs';

export default class AudioSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = null;
    this.audioOffset = 0;    // seek position for resume (seconds)
    this._playing = false;
    this._wallStartTime = 0;
    this._audioStartTime = 0; // ctx.currentTime when audio was scheduled
    this._hardwareLatency = 0; // baseLatency + outputLatency (cached)
    this._latencyCached = false;

    // User-adjustable calibration (ms), persisted across sessions.
    const saved = localStorage.getItem(STORAGE_KEY);
    this._userOffsetMs = saved !== null ? parseFloat(saved) : 0;
  }

  load(key) {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
    this.sound = this.scene.sound.add(key, { loop: false });
    this.sound.on('complete', () => {
      this._playing = false;
      this.scene.events.emit('song-complete');
    });
  }

  play(offset = 0) {
    if (!this.sound) return;
    this.audioOffset = offset;
    this._wallStartTime = performance.now();
    this._playing = true;
    this.sound.play(offset > 0 ? { seek: offset } : undefined);

    // Phaser sets sound.startTime = ctx.currentTime + audioPlayDelay inside play().
    // Reading it here gives us the exact scheduled start — the deterministic reference.
    const ctx = this._ctx;
    if (ctx && typeof this.sound.startTime === 'number') {
      this._audioStartTime = this.sound.startTime;
      // Cache hardware latency on first play (stable for AudioContext lifetime).
      if (!this._latencyCached) {
        this._latencyCached = true;
        const out  = typeof ctx.outputLatency === 'number' ? ctx.outputLatency : 0;
        const base = typeof ctx.baseLatency   === 'number' ? ctx.baseLatency   : 0;
        this._hardwareLatency = out + base;
        console.log(
          `[AudioSync] baseLatency=${(base*1000).toFixed(1)}ms` +
          ` outputLatency=${(out*1000).toFixed(1)}ms` +
          ` total=${(this._hardwareLatency*1000).toFixed(1)}ms` +
          ` userOffset=${this._userOffsetMs.toFixed(0)}ms`
        );
      }
    }
  }

  stop() {
    if (this.sound) this.sound.stop();
    this._playing = false;
  }

  get _ctx() {
    try { return this.scene.sound.context; } catch (e) { return null; }
  }

  get currentTime() {
    if (!this.sound || !this._playing) return this.audioOffset;

    const ctx = this._ctx;
    if (ctx && this._audioStartTime > 0) {
      // Primary clock: audioContext.currentTime anchored to the scheduled start.
      // Subtract hardware latency so we return the *heard* position, not scheduled.
      // Add user calibration offset (convert ms → s).
      const elapsed = ctx.currentTime - this._audioStartTime;
      const latency = this._hardwareLatency;
      const userOff = this._userOffsetMs / 1000;
      return this.audioOffset + elapsed - latency + userOff;
    }

    // Fallback: wall-clock elapsed (no AudioContext or before first play).
    return this.audioOffset + (performance.now() - this._wallStartTime) / 1000;
  }

  /** Total hardware pipeline latency detected at play time (seconds). */
  get audioLatency() { return this._hardwareLatency; }

  /** User calibration offset in milliseconds. Positive = notes arrive later. */
  get userOffsetMs() { return this._userOffsetMs; }
  set userOffsetMs(ms) {
    this._userOffsetMs = ms;
    localStorage.setItem(STORAGE_KEY, String(ms));
  }

  get isPlaying() { return this._playing; }

  destroy() {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
  }
}
