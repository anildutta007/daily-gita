// High-fidelity Speech Engine for Bhagavad Gita
// Integrates:
// 1. Natural Cloud Audio Stream (Google Neural TTS audio) for human-like reverent narration
// 2. Intelligent browser Neural voice fallback (Microsoft Natural / Google / Apple Siri voices)
// 3. User-selectable Voice Persona (e.g. "Devotional Master", "Soothing Guide", "Guru")

export interface SpeechOptions {
  text: string;
  lang: 'hi' | 'en';
  voiceStyle?: 'natural_online' | 'browser_neural';
  rate?: number; // 0.85 - 1.0
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class GitaSpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
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

  // Find the highest-quality natural neural voice on user's device
  public getBestBrowserVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === 'hi') {
      // Prioritize modern neural voices: Microsoft Swara/Madhur/Hemant/Kalpana Online (Natural), Google हिन्दी, Lekha
      const hindiPriority = [
        'natural', 'online', 'swara', 'madhur', 'hemant', 'kalpana', 'google हिन्दी', 'hindi', 'lekha'
      ];
      for (const keyword of hindiPriority) {
        const found = voices.find(v => 
          (v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) && 
          v.name.toLowerCase().includes(keyword)
        );
        if (found) return found;
      }
      return voices.find(v => v.lang.toLowerCase().includes('hi')) || null;
    } else {
      // English: Prioritize warm British / Indian / US Natural voices: Microsoft Neerja/Prabhat/Aria/Guy (Natural), Google UK English Male/Female, Samantha, Daniel
      const engPriority = [
        'natural', 'neural', 'neerja', 'prabhat', 'google uk english', 'george', 'aria', 'guy', 'en-in', 'rishi'
      ];
      for (const keyword of engPriority) {
        const found = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          v.name.toLowerCase().includes(keyword)
        );
        if (found) return found;
      }
      return voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    }
  }

  // Play natural cloud audio stream (Google Neural stream)
  // Splits long text into natural pauses (sentence boundaries)
  private playCloudAudioChunk(textChunk: string, lang: 'hi' | 'en'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isCancelled) {
        resolve();
        return;
      }
      
      const cleanText = encodeURIComponent(textChunk.trim());
      if (!cleanText) {
        resolve();
        return;
      }

      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${cleanText}`;
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        console.warn('Cloud audio stream encountered network error, falling back to neural speech synth', e);
        this.currentAudio = null;
        reject(e);
      };

      // Play with gentle fade/volume
      audio.play().catch(err => {
        this.currentAudio = null;
        reject(err);
      });
    });
  }

  // Primary recitation method
  public async speak(options: SpeechOptions): Promise<void> {
    this.cancel();
    this.isCancelled = false;

    const rate = options.rate || 0.9;
    const cleanText = options.text.replace(/[*_#`]/g, '').trim();

    // Strategy 1: Try natural cloud stream if text is suitable
    const sentences = cleanText.match(/[^.!?।\n]+[.!?।\n]+|[^.!?।\n]+/g) || [cleanText];
    
    let cloudFailed = false;
    try {
      for (const sentence of sentences) {
        if (this.isCancelled) break;
        const trimmed = sentence.trim();
        if (trimmed.length === 0) continue;

        // Cloud endpoint works reliably under 180 chars per phrase
        if (trimmed.length < 180) {
          try {
            await this.playCloudAudioChunk(trimmed, options.lang);
            // Small contemplative breathing pause between verses/sentences
            await new Promise(r => setTimeout(r, 260));
          } catch (cloudErr) {
            cloudFailed = true;
            break;
          }
        } else {
          // If sentence is unusually long, use neural synthesis for that part
          cloudFailed = true;
          break;
        }
      }
    } catch (e) {
      cloudFailed = true;
    }

    // Strategy 2: If cloud stream had network issue or text too long, use highest quality browser neural voice
    if (cloudFailed && !this.isCancelled) {
      await this.speakWithBrowserNeural({
        ...options,
        text: cleanText,
        rate
      });
    }

    if (options.onEnd) options.onEnd();
  }

  // Browser Neural Speech Synthesis
  private speakWithBrowserNeural(options: SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.rate = options.rate || 0.88; // gentle, deliberate tempo for wisdom
      utterance.pitch = options.pitch || 0.98; // slightly deeper, warmer resonant tone

      const targetLang = options.lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.lang = targetLang;

      const bestVoice = this.getBestBrowserVoice(options.lang);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
    }
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public cancel() {
    this.isCancelled = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!(this.currentAudio || (this.synth && this.synth.speaking));
  }
}

export const gitaSpeech = new GitaSpeechEngine();
