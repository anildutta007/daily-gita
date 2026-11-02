// Audio Player & Hybrid Recitation Service
// Uses pre-rendered Studio-Grade Indian Neural Audio (.mp3) when available,
// seamlessly falling back to in-browser Web Speech synthesis if offline.

import { gitaSpeech } from './speech';

class GitaAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private isCancelled: boolean = false;

  public async playVerse(params: {
    chapter: number;
    verse: number;
    language: 'sanskrit_then_hindi' | 'sanskrit_then_english' | 'hindi_only' | 'english_only';
    fallbackRecitation: () => Promise<void>;
  }): Promise<void> {
    this.stop();
    this.isCancelled = false;

    // Determine target audio file path based on language choice
    const isHindiTarget =
      params.language === 'sanskrit_then_hindi' || params.language === 'hindi_only';
    const langSuffix = isHindiTarget ? 'hi' : 'en';
    const audioUrl = `/audio/verses/ch${params.chapter}_v${params.verse}_${langSuffix}.mp3`;

    try {
      // Check if neural audio exists by checking HEAD/fetch or directly loading
      const canPlay = await this.playAudioUrl(audioUrl);
      if (canPlay) {
        return;
      }
    } catch (e) {
      console.warn(`[GitaAudioPlayer] Neural audio not found for ch${params.chapter}_v${params.verse}, using fallback.`, e);
    }

    // Fallback to client-side speech synthesis
    if (!this.isCancelled) {
      await params.fallbackRecitation();
    }
  }

  private playAudioUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      this.currentAudio = audio;
      let resolved = false;

      audio.src = url;

      audio.oncanplaythrough = () => {
        if (this.isCancelled) {
          audio.pause();
          resolve(false);
          return;
        }
        audio.play().catch(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        });
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };

      audio.onerror = () => {
        this.currentAudio = null;
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      };
    });
  }

  public stop(): void {
    this.isCancelled = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    gitaSpeech.cancel();
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    } else {
      gitaSpeech.pause();
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    } else {
      gitaSpeech.resume();
    }
  }

  public isPlaying(): boolean {
    return (
      (this.currentAudio !== null && !this.currentAudio.paused) ||
      gitaSpeech.isSpeaking()
    );
  }
}

export const gitaAudioPlayer = new GitaAudioPlayer();
