/**
 * Wraps Phaser sound with accurate position tracking.
 * Prefers sound.seek (Web Audio clock) over performance.now() arithmetic.
 */
export default class AudioSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = null;
    this.startTime = 0;     // performance.now() fallback
    this.audioOffset = 0;
    this._playing = false;
    this._duration = 0;
  }

  load(key) {
    this.sound = this.scene.sound.add(key, { loop: false });
    this._duration = this.scene.cache.audio.get(key)?.duration || 0;
    this.sound.on('complete', () => {
      this._playing = false;
      this.scene.events.emit('song-complete');
    });
  }

  play(offset = 0) {
    if (!this.sound) return;
    this.audioOffset = offset;
    this.startTime = performance.now();
    this._playing = true;
    this.sound.play(offset > 0 ? { seek: offset } : undefined);
  }

  stop() {
    if (this.sound) this.sound.stop();
    this._playing = false;
  }

  get currentTime() {
    if (!this.sound || !this._playing) return this.audioOffset;
    // Phaser's WebAudioSound.seek is the actual Web Audio context position —
    // far more accurate than performance.now() arithmetic (no clock drift).
    if (typeof this.sound.seek === 'number' && this.sound.seek > 0) {
      return this.sound.seek;
    }
    // Fallback for HTMLAudioSound or before first frame
    return this.audioOffset + (performance.now() - this.startTime) / 1000;
  }

  get isPlaying() { return this._playing; }
  get duration()  { return this._duration; }

  destroy() {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
  }
}
