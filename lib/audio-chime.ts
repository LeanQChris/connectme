/**
 * Lightweight in-browser notification sound synthesized via the Web Audio API.
 * Requires no external audio files or network requests.
 */

class SoundNotifier {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("connectme_sound_enabled");
      if (saved !== null) {
        this.soundEnabled = saved === "true";
      }
    }
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("connectme_sound_enabled", String(this.soundEnabled));
    }
    if (this.soundEnabled) {
      this.playChime();
    }
    return this.soundEnabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public playChime(): void {
    if (!this.soundEnabled || typeof window === "undefined") return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: High crisp bell (880Hz / A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);

      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: Harmonious resonance (1318.5Hz / E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.5, now + 0.1);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.18, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.1);
      osc2.stop(now + 0.55);
    } catch {
      // Audio playback silently skipped if browser permissions block it
    }
  }
}

export const soundNotifier = new SoundNotifier();
