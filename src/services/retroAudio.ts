/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural 8-bit Web Audio synthesizer inspired by Famicom / Dendy (2A03 chip)
class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTimeoutId: number | null = null;
  private volume: number = 0.3;
  private noteIndex: number = 0;

  // Japanese retro city-pop / aquarium melody notes (Frequencies in Hz)
  // Pentatonic & Japanese Insen-inspired soothing loop: C4, D4, Eb4, G4, Bb4, C5, D5, Eb5, G5
  private melodyNotes: number[] = [
    261.63, 293.66, 311.13, 392.00, 466.16, 523.25, 392.00, 311.13,
    293.66, 311.13, 392.00, 466.16, 523.25, 587.33, 622.25, 523.25,
    466.16, 392.00, 349.23, 311.13, 293.66, 261.63, 293.66, 392.00,
    311.13, 261.63, 233.08, 261.63, 311.13, 392.00, 466.16, 523.25,
  ];

  // Bass roots for triangle wave
  private bassNotes: number[] = [
    130.81, 130.81, 155.56, 155.56, 116.54, 116.54, 130.81, 130.81
  ];

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

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.bgmPlaying) {
      this.stopBGM();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Play a retro square wave beep / UI click
  public playBlip(freq = 600, duration = 0.04) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + duration);

      gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  // Bubble pop sound (underwater water droplet / bubble)
  public playBubblePop() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = 250 + Math.random() * 150;
      const endFreq = startFreq + 350 + Math.random() * 200;

      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }

  // Fish chomp / eating pellet
  public playChomp() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      // Secondary soft pop
      setTimeout(() => {
        this.playBubblePop();
      }, 50);
    } catch {}
  }

  // Water splash / clean glass swoosh
  public playSplash() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Procedural white noise burst for water splash
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {}
  }

  // Dendy 8-bit Coin pickup sound (two tone arpeggio B5 -> E6)
  public playCoin() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // Fin Flare / Powerup swoosh
  public playFlare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Level up / VIP donation triumphant fanfare
  public playFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);

          const dur = idx === 3 ? 0.4 : 0.12;
          gain.gain.setValueAtTime(this.volume * 0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + dur);
        } catch {}
      }, idx * 110);
    });
  }

  // Knock on glass (tap water)
  public playKnock() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // Background Lo-Fi 90s Chiptune Aquarium Melody
  public toggleBGM(): boolean {
    if (this.bgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isBgmActive(): boolean {
    return this.bgmPlaying;
  }

  public startBGM() {
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.scheduleNextNote();
  }

  public stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimeoutId !== null) {
      window.clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
  }

  private scheduleNextNote() {
    if (!this.bgmPlaying || this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const noteFreq = this.melodyNotes[this.noteIndex % this.melodyNotes.length];
    const bassFreq = this.bassNotes[Math.floor(this.noteIndex / 4) % this.bassNotes.length];
    const noteDuration = 0.22;
    const intervalMs = 260; // ~115 BPM 8-bit pulse

    try {
      const now = ctx.currentTime;

      // Melody voice: 25% pulse-width approximation using square wave with warm filter
      const osc1 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain1 = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(noteFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      gain1.gain.setValueAtTime(this.volume * 0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + noteDuration);

      // Bass voice: every 4 notes, soft triangle wave
      if (this.noteIndex % 2 === 0) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(this.volume * 0.15, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);

        bassOsc.start(now);
        bassOsc.stop(now + 0.45);
      }
    } catch {}

    this.noteIndex++;
    this.bgmTimeoutId = window.setTimeout(() => {
      this.scheduleNextNote();
    }, intervalMs);
  }
}

export const retroAudio = new RetroAudioEngine();
