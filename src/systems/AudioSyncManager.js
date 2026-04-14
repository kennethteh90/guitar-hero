/**
 * Wraps Phaser sound with accurate position tracking.
 *
 * Time source priority:
 *   1. AudioContext.currentTime — hardware-backed monotonic clock, no drift.
 *      We snapshot ctx.currentTime at the moment play() is called and compute
 *      elapsed from that, which gives sub-millisecond accuracy regardless of
 *      frame rate or garbage-collection pauses.
 *   2. sound.seek — Phaser's getter (also uses ctx.currentTime internally for
 *      WebAudioSound); used as a cross-check / HTMLAudio fallback.
 *   3. performance.now() — last resort when Web Audio is unavailable.
 */
export default class AudioSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = null;
    this.audioOffset = 0;
    this._playing = false;
    this._ctxStartTime = null;   // AudioContext.currentTime snapshot at play()
    this._wallStartTime = 0;     // performance.now() snapshot at play()
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

    // Snapshot the Web Audio clock before calling play() so elapsed time is
    // computed from a consistent reference with no startup-latency bias.
    const ctx = this.scene.sound.context;   // WebAudioSoundManager exposes this
    this._ctxStartTime = ctx ? ctx.currentTime : null;

    this._playing = true;
    this.sound.play(offset > 0 ? { seek: offset } : undefined);
  }

  stop() {
    if (this.sound) this.sound.stop();
    this._playing = false;
  }

  get currentTime() {
    if (!this.sound || !this._playing) return this.audioOffset;

    // Primary: AudioContext clock — monotonic, drift-free.
    const ctx = this.scene.sound.context;
    if (ctx && this._ctxStartTime !== null) {
      return this.audioOffset + Math.max(0, ctx.currentTime - this._ctxStartTime);
    }

    // Secondary: Phaser's seek getter (computed from ctx.currentTime internally
    // for WebAudioSound; works for HTMLAudioSound too).
    if (typeof this.sound.seek === 'number' && this.sound.seek >= 0) {
      return this.sound.seek;
    }

    // Fallback: wall clock.
    return this.audioOffset + (performance.now() - this._wallStartTime) / 1000;
  }

  get isPlaying() { return this._playing; }

  destroy() {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
    this._ctxStartTime = null;
  }
}
