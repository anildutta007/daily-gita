// Robust, Instant-Response Multilingual Speech Engine for Bhagavad Gita
// Utilizes browser-native SpeechSynthesis with:
// 1. Zero external network/CORS dependency (works 100% reliably in every browser)
// 2. Intelligent voice selection prioritizing natural human-like neural voices:
//    - Hindi: Google हिन्दी, Microsoft Swara/Madhur/Hemant/Kalpana (Natural), Lekha, hi-IN
//    - English: Microsoft Neerja/Prabhat/Aria/Guy (Natural), Google UK/Indian English, Samantha
// 3. Proper chunking and anti-stalling keepalive for continuous recitation

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

  // Select the highest quality neural / natural voice available for Hindi or English
  public getBestVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === 'hi') {
      // Prioritize natural / neural Hindi voices
      const hindiPreferences = [
        'natural', 'online', 'swara', 'madhur', 'hemant', 'kalpana', 'google हिन्दी', 'hindi', 'lekha'
      ];
      for (const pref of hindiPreferences) {
        const match = voices.find(v => 
          (v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) && 
          v.name.toLowerCase().includes(pref)
        );
        if (match) return match;
      }
      // Any Hindi voice
      const anyHindi = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (anyHindi) return anyHindi;

      // Fallback: Indian English voice that pronounces Sanskrit well
      const indianVoice = voices.find(v => v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india'));
      if (indianVoice) return indianVoice;

      return null;
    } else {
      // English preferences: Natural / Neural Indian English, British, or US English
      const engPreferences = [
        'natural', 'neerja', 'prabhat', 'google uk english', 'george', 'aria', 'guy', 'en-in', 'samantha'
      ];
      for (const pref of engPreferences) {
        const match = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          v.name.toLowerCase().includes(pref)
        );
        if (match) return match;
      }
      return voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    }
  }

  // Speak a single phrase cleanly
  private speakChunk(text: string, lang: 'hi' | 'en', rate: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isCancelled) {
        resolve();
        return;
      }

      // Resume speech synthesis if suspended by browser
      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      let timeoutId: any = null;

      utterance.onstart = () => {
        // Chromium keepalive: periodically resume to prevent browser dropping long audio
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

  // Speak text with graceful phrase splitting
  public async speak(options: SpeechOptions): Promise<void> {
    this.cancel();
    this.isCancelled = false;

    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    // Ensure voices are initialized
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const cleanText = options.text.replace(/[*_#`॥]/g, '').trim();
    if (!cleanText) return;

    // Split into sentences for natural rhythm and to prevent browser truncation
    const chunks = cleanText.split(/[\n।\.]+/).map(s => s.trim()).filter(s => s.length > 0);
    const rate = options.rate || (options.lang === 'hi' ? 0.86 : 0.92);

    for (const chunk of chunks) {
      if (this.isCancelled) break;
      await this.speakChunk(chunk, options.lang, rate);
      // Small meditative breath between lines
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
