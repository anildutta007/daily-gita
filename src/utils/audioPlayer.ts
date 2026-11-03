// Audio Player & Hybrid Recitation Service
// Uses pre-rendered Studio-Grade Indian Neural Audio (.mp3) when available,
// seamlessly falling back to in-browser Web Speech synthesis if offline.
// Guarantees strict single-audio concurrency: any new play request immediately terminates any ongoing audio.

import { gitaSpeech } from './speech';

class GitaAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayId: number = 0;

  public async playVerse(params: {
    chapter: number;
    verse: number;
    language: 'sanskrit_then_hindi' | 'sanskrit_then_english' | 'hindi_only' | 'english_only';
    fallbackRecitation: () => Promise<void>;
  }): Promise<void> {
    // Generate unique playId for this invocation to prevent overlapping tracks
    const playId = ++this.currentPlayId;

    // Immediately stop any currently playing or scheduled audio
    this.stopInternal();

    // Determine target audio file path based on language choice
    const isHindiTarget =
      params.language === 'sanskrit_then_hindi' || params.language === 'hindi_only';
    const langSuffix = isHindiTarget ? 'hi' : 'en';
    const audioUrl = `/audio/verses/ch${params.chapter}_v${params.verse}_${langSuffix}.mp3`;

    try {
      const canPlay = await this.playAudioUrl(audioUrl, playId);
      if (canPlay) {
        return;
      }
    } catch (e) {
      console.warn(`[GitaAudioPlayer] Neural audio not found for ch${params.chapter}_v${params.verse}, using fallback.`, e);
    }

    // Check if this playback request was superseded while loading
    if (playId !== this.currentPlayId) {
      return;
    }

    // Fallback to client-side speech synthesis
    await params.fallbackRecitation();
  }

  private playAudioUrl(url: string, playId: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (playId !== this.currentPlayId) {
        resolve(false);
        return;
      }

      const audio = new Audio();
      this.currentAudio = audio;
      let resolved = false;

      const cleanup = () => {
        audio.oncanplaythrough = null;
        audio.onended = null;
        audio.onerror = null;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
      };

      audio.src = url;

      audio.oncanplaythrough = () => {
        if (playId !== this.currentPlayId) {
          audio.pause();
          cleanup();
          resolve(false);
          return;
        }
        audio.play().catch(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        });
      };

      audio.onended = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(playId === this.currentPlayId);
        }
      };

      audio.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      };
    });
  }

  private stopInternal(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }
    gitaSpeech.cancel();
  }

  public stop(): void {
    this.currentPlayId++;
    this.stopInternal();
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
