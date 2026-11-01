// Robust, Instant-Response Multilingual Speech Engine for Bhagavad Gita
// Supports Male & Female voice selections with intelligent natural voice matching

export interface SpeechOptions {
  text: string;
  lang: 'hi' | 'en';
  gender?: 'male' | 'female';
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

  // Select voice based on language and Male / Female preference
  public getBestVoice(lang: 'hi' | 'en', gender: 'male' | 'female' = 'male'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === 'hi') {
      if (gender === 'male') {
        const maleKeywords = ['madhur', 'hemant', 'male', 'prabhat', 'google हिन्दी'];
        for (const kw of maleKeywords) {
          const match = voices.find(v => 
            (v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) &&
            v.name.toLowerCase().includes(kw)
          );
          if (match) return match;
        }
      } else {
        const femaleKeywords = ['swara', 'kalpana', 'female', 'lekha', 'neerja'];
        for (const kw of femaleKeywords) {
          const match = voices.find(v => 
            (v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) &&
            v.name.toLowerCase().includes(kw)
          );
          if (match) return match;
        }
      }

      // General Hindi fallback
      const anyHindi = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (anyHindi) return anyHindi;

      // Indian English fallback
      return voices.find(v => v.lang.toLowerCase() === 'en-in') || null;
    } else {
      // English
      if (gender === 'male') {
        const maleKeywords = ['prabhat', 'guy', 'george', 'male', 'rishi', 'david', 'daniel'];
        for (const kw of maleKeywords) {
          const match = voices.find(v => 
            v.lang.toLowerCase().startsWith('en') && 
            v.name.toLowerCase().includes(kw)
          );
          if (match) return match;
        }
      } else {
        const femaleKeywords = ['neerja', 'aria', 'samantha', 'female', 'zira', 'katherine', 'victoria'];
        for (const kw of femaleKeywords) {
          const match = voices.find(v => 
            v.lang.toLowerCase().startsWith('en') && 
            v.name.toLowerCase().includes(kw)
          );
          if (match) return match;
        }
      }

      return voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    }
  }

  private speakChunk(text: string, lang: 'hi' | 'en', gender: 'male' | 'female', rate: number): Promise<void> {
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
      // Adjust pitch slightly: slightly deeper for male (0.95), slightly brighter for female (1.05)
      utterance.pitch = gender === 'male' ? 0.95 : 1.05;
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      const voice = this.getBestVoice(lang, gender);
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

    const cleanText = options.text.replace(/[*_#`॥]/g, '').trim();
    if (!cleanText) return;

    const chunks = cleanText.split(/[\n।\.]+/).map(s => s.trim()).filter(s => s.length > 0);
    const rate = options.rate || (options.lang === 'hi' ? 0.86 : 0.92);
    const gender = options.gender || 'male';

    for (const chunk of chunks) {
      if (this.isCancelled) break;
      await this.speakChunk(chunk, options.lang, gender, rate);
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
