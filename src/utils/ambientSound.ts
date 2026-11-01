// Ambient sound synthesizer using Web Audio API
// Generates soothing Indian classical flute, tanpura drone, or meditative Om frequency without external mp3s!

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentMode: 'flute' | 'tanpura' | 'om' | 'none' = 'none';
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private intervalTimer: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(mode: 'flute' | 'tanpura' | 'om' | 'none', volume = 0.25) {
    this.stop();
    if (mode === 'none') return;
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.currentMode = mode;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (mode === 'tanpura') {
      this.playTanpura();
    } else if (mode === 'om') {
      this.playOm();
    } else if (mode === 'flute') {
      this.playFluteMelody();
    }
  }

  // Tanpura: Root Sa (136.1 Hz - cosmic om frequency) + Pa (204.1 Hz) + Sa octave
  private playTanpura() {
    if (!this.ctx || !this.gainNode) return;
    const baseFreq = 136.1; // C# / Om frequency
    const harmonics = [baseFreq, baseFreq * 1.5, baseFreq * 2, baseFreq * 2.25];

    harmonics.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();
      
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      // Subtle slow shimmer LFO
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.1, this.ctx!.currentTime);
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.setValueAtTime(0.04, this.ctx!.currentTime);
      lfo.connect(oscGain.gain);
      lfo.start();
      this.oscillators.push(lfo);

      oscGain.gain.setValueAtTime(0.15 / (idx + 1), this.ctx!.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.gainNode!);
      osc.start();
      this.oscillators.push(osc);
    });
  }

  // Om drone: 108Hz / 136.1Hz with warm sub-bass and resonance
  private playOm() {
    if (!this.ctx || !this.gainNode) return;
    const freqs = [108, 136.1, 216, 272.2];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      // Slow breathing swell
      const breathLfo = this.ctx!.createOscillator();
      breathLfo.frequency.setValueAtTime(0.1, this.ctx!.currentTime); // 10s cycle
      const breathGain = this.ctx!.createGain();
      breathGain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
      breathLfo.connect(oscGain.gain);
      breathLfo.start();
      this.oscillators.push(breathLfo);

      oscGain.gain.setValueAtTime(0.2 / (idx + 1), this.ctx!.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.gainNode!);
      osc.start();
      this.oscillators.push(osc);
    });
  }

  // Indian Flute (Bansuri) meditative tones (Raga Yaman / Bhupali notes)
  private playFluteMelody() {
    if (!this.ctx || !this.gainNode) return;
    // Raga Bhupali notes (Sa, Re, Ga, Pa, Dha): C4, D4, E4, G4, A4
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 392.00, 329.63];
    let noteIdx = 0;

    const playTone = () => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      // Flute has sine fundamental with soft breath harmonics
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Flute vibrato (5 Hz subtle pitch wobble)
      const vibrato = this.ctx.createOscillator();
      vibrato.frequency.setValueAtTime(5.5, this.ctx.currentTime);
      const vibratoGain = this.ctx.createGain();
      vibratoGain.gain.setValueAtTime(2.5, this.ctx.currentTime);
      vibrato.connect(osc.frequency);
      vibrato.start();

      // Envelope: gentle attack, sustain, gentle release
      const now = this.ctx.currentTime;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.2, now + 0.8);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);
      osc.start(now);
      osc.stop(now + 4);
      vibrato.stop(now + 4);
    };

    playTone();
    this.intervalTimer = setInterval(() => {
      playTone();
    }, 4200);
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  public getActiveMode() {
    return this.isPlaying ? this.currentMode : 'none';
  }
}

export const ambientSound = new AmbientSoundEngine();
