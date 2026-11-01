// Speech synthesis helper for multilingual Bhagavad Gita recitation
// Supports Sanskrit / Hindi and English voices

export interface SpeechOptions {
  text: string;
  lang: 'hi-IN' | 'en-IN' | 'en-US';
  rate?: number; // 0.8 to 1.2
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class GitaSpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public speak(options: SpeechOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        console.warn('Speech synthesis not supported on this browser.');
        resolve();
        return;
      }

      this.cancel(); // Stop any previous speech

      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.rate = options.rate || 0.9; // slightly slower for reverent chanting
      utterance.pitch = options.pitch || 1.0;
      utterance.lang = options.lang;

      // Find matching voice
      const voices = this.getVoices();
      let bestVoice = voices.find(v => v.lang === options.lang || v.lang.replace('_', '-').startsWith(options.lang.split('-')[0]));
      
      // If asking for Hindi
      if (options.lang.startsWith('hi')) {
        const hindiVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('kalpana') || v.name.toLowerCase().includes('hemant'));
        if (hindiVoice) bestVoice = hindiVoice;
      }

      // If asking for English (prefer Indian English if available for genuine spiritual diction)
      if (options.lang.startsWith('en')) {
        const indianEnglish = voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('ravi') || v.name.toLowerCase().includes('heera'));
        if (indianEnglish) bestVoice = indianEnglish;
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (options.onError) options.onError(e);
        resolve(); // resolve so queue doesn't hang
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
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
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!(this.synth && this.synth.speaking);
  }
}

export const gitaSpeech = new GitaSpeechEngine();
