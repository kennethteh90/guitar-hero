/**
 * Wraps Phaser sound with accurate position tracking.
 *
 * Uses sound.seek as the primary time source. For WebAudioSound, Phaser's
 * seek getter computes `ctx.currentTime - internalStartTime + seekOffset`
 * where internalStartTime is captured at the moment the BufferSource is
 * actually scheduled — the correct reference point. Capturing ctx.currentTime
 * ourselves (before sound.play()) would include Phaser's setup overhead and
 * run consistently ahead of the real audio position.
 *
 * Fallback chain: sound.seek → performance.now() wall clock.
 */
export default class AudioSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = null;
    this.audioOffset = 0;
    this._playing = false;
    this._wallStartTime = 0;
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
  }

  stop() {
    if (this.sound) this.sound.stop();
    this._playing = false;
  }

  get currentTime() {
    if (!this.sound || !this._playing) return this.audioOffset;

    // sound.seek: for WebAudioSound, Phaser computes this live from
    // ctx.currentTime using the startTime it captured when the BufferSource
    // was actually scheduled — the correct zero reference.
    // Works for HTMLAudioSound too (returns the <audio> element's currentTime).
    if (this.sound.isPlaying && typeof this.sound.seek === 'number') {
      return this.sound.seek;
    }

    // Fallback: wall-clock elapsed since play() was called.
    return this.audioOffset + (performance.now() - this._wallStartTime) / 1000;
  }

  get isPlaying() { return this._playing; }

  destroy() {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
  }
}
