// Unified Speech Engine for Bhagavad Gita
// Supports:
// 1. ElevenLabs Premium Audio Stream (Ultra-realistic human voices with multilingual models)
// 2. Browser Native Speech Synthesis (High-reliability fallback with Male/Female natural voices)

export interface SpeechOptions {
  text: string;
  lang: 'hi' | 'en';
  gender?: 'male' | 'female';
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
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

  // Play audio preview directly from an audio URL (e.g. for ElevenLabs voice preview sample)
  public playAudioSample(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cancel();
      this.isCancelled = false;

      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        this.currentAudio = null;
        reject(e);
      };
      audio.play().catch(reject);
    });
  }

  // Generate and play audio directly from ElevenLabs REST API
  private async speakElevenLabs(
    text: string,
    apiKey: string,
    voiceId: string
  ): Promise<boolean> {
    try {
      if (this.isCancelled) return false;

      const cleanText = text.replace(/[*_#`॥]/g, '').trim();
      if (!cleanText) return true;

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey.trim(),
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.15,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        console.warn('ElevenLabs API response not ok:', response.status, response.statusText);
        return false;
      }

      const blob = await response.blob();
      if (this.isCancelled) return false;

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (e) => {
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          reject(e);
        };
        audio.play().catch(reject);
      });

      return true;
    } catch (err) {
      console.warn('ElevenLabs speech failed, falling back to browser neural voice:', err);
      return false;
    }
  }

  // Select voice based on language and Male / Female preference for fallback
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

      const anyHindi = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (anyHindi) return anyHindi;

      return voices.find(v => v.lang.toLowerCase() === 'en-in') || null;
    } else {
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

  private speakNativeChunk(text: string, lang: 'hi' | 'en', gender: 'male' | 'female', rate: number): Promise<void> {
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

  // Unified speak routine
  public async speak(options: SpeechOptions): Promise<void> {
    this.cancel();
    this.isCancelled = false;

    const cleanText = options.text.replace(/[*_#`॥]/g, '').trim();
    if (!cleanText) return;

    // Check if user has provided an ElevenLabs API key and chosen a voice
    if (options.elevenLabsApiKey && options.elevenLabsVoiceId) {
      const success = await this.speakElevenLabs(
        cleanText,
        options.elevenLabsApiKey,
        options.elevenLabsVoiceId
      );
      if (success) {
        if (options.onEnd) options.onEnd();
        return;
      }
    }

    // Fallback: Browser Native Speech Synthesis
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const chunks = cleanText.split(/[\n।\.]+/).map(s => s.trim()).filter(s => s.length > 0);
    const rate = options.rate || (options.lang === 'hi' ? 0.86 : 0.92);
    const gender = options.gender || 'male';

    for (const chunk of chunks) {
      if (this.isCancelled) break;
      await this.speakNativeChunk(chunk, options.lang, gender, rate);
      await new Promise(r => setTimeout(r, 220));
    }

    if (options.onEnd) options.onEnd();
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
    return !!(this.currentAudio || (this.synth && (this.synth.speaking || this.synth.pending)));
  }
}

export const gitaSpeech = new GitaSpeechEngine();
