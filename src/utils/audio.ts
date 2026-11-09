/**
 * Web Audio API synthesizer for athletic rest timer beeps & PR celebratory chime.
 * 100% offline, requires no external sound files or internet connection.
 */

class AudioController {
  private ctx: AudioContext | null = null;
  private lastRestPlayTime: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTick(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio is non-blocking and safe
    }
  }

  public playClick(): void {
    this.playTick();
  }

  public playBeepLow(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  public playBeepHigh(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  public playFinish(): void {
    this.playRestComplete();
  }

  public playSuccess(): void {
    this.playPRCelebration();
  }

  public playRestComplete(): void {
    try {
      const nowMs = Date.now();
      // Debounce if multiple sessions complete at the very same fraction of second (< 400ms)
      if (nowMs - this.lastRestPlayTime < 400) {
        return;
      }
      this.lastRestPlayTime = nowMs;

      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Triple high-energy athletic chime
      [
        { freq: 587.33, start: 0, duration: 0.12 }, // D5
        { freq: 880.00, start: 0.14, duration: 0.12 }, // A5
        { freq: 1174.66, start: 0.28, duration: 0.35 }  // D6 (high accent)
      ].forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.18, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration);
      });
    } catch {
      // Ignore audio error if muted or blocked by policy
    }
  }

  public playRestFinished(): void {
    this.playRestComplete();
  }

  public playPRCelebration(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Victorious fanfare chord
      const chords = [
        { freq: 523.25, start: 0, dur: 0.15 },
        { freq: 659.25, start: 0.12, dur: 0.15 },
        { freq: 783.99, start: 0.24, dur: 0.2 },
        { freq: 1046.50, start: 0.40, dur: 0.6 }
      ];

      chords.forEach(c => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(c.freq, now + c.start);

        gain.gain.setValueAtTime(0.12, now + c.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.start + c.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + c.start);
        osc.stop(now + c.start + c.dur);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundEffects = new AudioController();
