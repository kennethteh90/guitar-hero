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
 * Audio output latency: sound.seek reports when audio is *scheduled* to the
 * hardware, but the beat is heard `outputLatency + baseLatency` seconds later.
 * We subtract this from currentTime so that notes visually arrive at the hit
 * zone at the same moment the player hears the corresponding beat.
 *
 * Fallback chain: sound.seek − latency → performance.now() wall clock.
 */
export default class AudioSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = null;
    this.audioOffset = 0;
    this._playing = false;
    this._wallStartTime = 0;
    this._outputLatency = null; // cached on first play
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
    // Cache output latency once — it's stable for the lifetime of the AudioContext.
    if (this._outputLatency === null) {
      this._outputLatency = this._measureOutputLatency();
    }
    this.sound.play(offset > 0 ? { seek: offset } : undefined);
  }

  /**
   * Returns total audio output latency in seconds.
   * outputLatency = hardware buffer delay (when scheduled → when heard at speakers)
   * baseLatency   = AudioContext internal processing latency
   * Together they represent the full pipeline delay.
   */
  _measureOutputLatency() {
    try {
      const ctx = this.scene.sound.context;
      if (!ctx) return 0;
      const out  = typeof ctx.outputLatency === 'number' ? ctx.outputLatency : 0;
      const base = typeof ctx.baseLatency   === 'number' ? ctx.baseLatency   : 0;
      return out + base;
    } catch (e) {
      return 0;
    }
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
    //
    // We subtract outputLatency so that currentTime represents the position of
    // audio the player is *hearing right now*, not the position being scheduled.
    // This makes notes arrive at the hit zone coincident with the audible beat.
    if (this.sound.isPlaying && typeof this.sound.seek === 'number') {
      const latency = this._outputLatency || 0;
      return this.sound.seek - latency;
    }

    // Fallback: wall-clock elapsed since play() was called.
    return this.audioOffset + (performance.now() - this._wallStartTime) / 1000;
  }

  get isPlaying() { return this._playing; }

  /** The total audio pipeline latency in seconds (output + base). */
  get audioLatency() { return this._outputLatency || 0; }

  destroy() {
    if (this.sound) { this.sound.destroy(); this.sound = null; }
  }
}
