// Standard High-Fidelity Speech Engine for Bhagavad Gita
// Exclusively uses soothing, natural Female voice (Swara, Neerja, Lekha, Aria, Samantha)
// Automatically filters out verse numbers (e.g. "1-15", "1.15", "1-1", "1.1") so the listener enjoys pure spiritual contemplation

export interface SpeechOptions {
  text: string;
  lang: 'hi' | 'en';
  rate?: number; // 0.85 - 1.0
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class GitaSpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isCancelled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    this.voices = this.synth.getVoices();
    return this.voices;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.voices || this.voices.length === 0) {
      return this.loadVoices();
    }
    return this.voices;
  }

  // Select optimal, soothing Female voice for Hindi or English
  public getBestFemaleVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === 'hi') {
      // Prioritize natural female Hindi voices (Swara, Kalpana, Lekha, Neerja)
      const femaleHindiKeywords = ['swara', 'kalpana', 'female', 'lekha', 'neerja', 'priya', 'madhu'];
      for (const kw of femaleHindiKeywords) {
        const match = voices.find(v => 
          (v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) &&
          v.name.toLowerCase().includes(kw)
        );
        if (match) return match;
      }

      // Any Hindi voice as fallback
      const anyHindi = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (anyHindi) return anyHindi;

      return voices.find(v => v.lang.toLowerCase() === 'en-in') || null;
    } else {
      // English female voices: Neerja, Aria, Samantha, Zira, Victoria, Katherine
      const femaleEngKeywords = ['neerja', 'aria', 'samantha', 'female', 'zira', 'katherine', 'victoria', 'serena', 'jenny'];
      for (const kw of femaleEngKeywords) {
        const match = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          v.name.toLowerCase().includes(kw)
        );
        if (match) return match;
      }

      return voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    }
  }

  // Thorough cleaner that strips all numerical verse references like 1-15, 1.15, [1-15], (1-15), etc.
  public cleanSpiritualText(raw: string): string {
    return raw
      // Remove verse number patterns like 1-15, 1.15, 1:15, 18-78, etc.
      .replace(/[०-९0-9]+[\-.:\/][०-९0-9]+/g, '')
      // Remove standalone brackets with numbers e.g. [1], (15)
      .replace(/[\[\(][०-९0-9]+[\]\)]/g, '')
      // Remove symbols like ॥, ।, *, _, #, `, ~
      .replace(/[*_#`॥~]/g, '')
      // Clean double spaces or leading/trailing hyphens
      .replace(/\s*--\s*/g, ' — ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private speakNativeChunk(text: string, lang: 'hi' | 'en', rate: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isCancelled) {
        resolve();
        return;
      }

      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      // Melodic, gentle pitch for soothing female voice
      utterance.pitch = 1.04;
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      const voice = this.getBestFemaleVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      let timeoutId: any = null;

      utterance.onstart = () => {
        timeoutId = setInterval(() => {
          if (this.synth && this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
            this.synth.resume();
          }
        }, 8000);
      };

      utterance.onend = () => {
        if (timeoutId) clearInterval(timeoutId);
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        if (timeoutId) clearInterval(timeoutId);
        console.warn('SpeechSynthesis error:', e);
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public async speak(options: SpeechOptions): Promise<void> {
    this.cancel();
    this.isCancelled = false;

    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const cleanText = this.cleanSpiritualText(options.text);
    if (!cleanText) return;

    // Split gracefully by sentence pauses
    const chunks = cleanText.split(/[\n।\.]+/).map(s => s.trim()).filter(s => s.length > 0);
    const rate = options.rate || (options.lang === 'hi' ? 0.86 : 0.92);

    for (const chunk of chunks) {
      if (this.isCancelled) break;
      await this.speakNativeChunk(chunk, options.lang, rate);
      await new Promise(r => setTimeout(r, 220));
    }

    if (options.onEnd) options.onEnd();
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public cancel() {
    this.isCancelled = true;
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!(this.synth && (this.synth.speaking || this.synth.pending));
  }
}

export const gitaSpeech = new GitaSpeechEngine();
