// Audio Player & Hybrid Recitation Service
// Plays pre-recorded studio-grade Indian Neural Audio (.mp3) files.
// Gracefully falls back to client speech synthesis ONLY if MP3 completely fails to load.

import { gitaSpeech } from './speech';

class GitaAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayId: number = 0;

  public async playVerse(params: {
    chapter: number;
    verse: number;
    language: 'sanskrit_then_hindi' | 'sanskrit_then_english';
    fallbackRecitation: () => Promise<void>;
  }): Promise<void> {
    const playId = ++this.currentPlayId;
    this.stopInternal();

    const isHindiTarget = params.language === 'sanskrit_then_hindi';
    const langSuffix = isHindiTarget ? 'hi' : 'en';

    // Support both Vite local server and deployed base URLs
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const audioUrl = `${cleanBase}audio/verses/ch${params.chapter}_v${params.verse}_${langSuffix}.mp3`;

    console.log(`[GitaAudioPlayer] Attempting to play neural MP3: ${audioUrl} (playId: ${playId})`);

    let playedSuccessfully = false;
    try {
      playedSuccessfully = await this.playAudioUrl(audioUrl, playId);
    } catch (err) {
      console.warn(`[GitaAudioPlayer] MP3 play failed for ${audioUrl}:`, err);
      playedSuccessfully = false;
    }

    // If cancelled or superseded by a newer track, do not continue
    if (playId !== this.currentPlayId) {
      return;
    }

    if (playedSuccessfully) {
      console.log(`[GitaAudioPlayer] Neural MP3 completed for ch${params.chapter}_v${params.verse}`);
      return;
    }

    // Only if MP3 fails (e.g. 404 or unsupported codec), fallback to synthetic speech
    console.warn(`[GitaAudioPlayer] MP3 not available, using fallback speech synthesis.`);
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
      let settled = false;

      const finish = (success: boolean) => {
        if (!settled) {
          settled = true;
          audio.onplay = null;
          audio.onended = null;
          audio.onerror = null;
          audio.onloadeddata = null;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve(success);
        }
      };

      // 10-second safety timeout for slow connections
      const timer = setTimeout(() => {
        if (!settled) {
          console.warn('[GitaAudioPlayer] Timeout waiting for audio buffer:', url);
          try {
            audio.pause();
            audio.src = '';
          } catch (e) {}
          finish(false);
        }
      }, 10000);

      audio.onended = () => {
        clearTimeout(timer);
        finish(playId === this.currentPlayId);
      };

      audio.onerror = (e) => {
        clearTimeout(timer);
        console.warn('[GitaAudioPlayer] Audio element error:', url, e);
        finish(false);
      };

      // Set source and call play directly
      audio.preload = 'auto';
      audio.src = url;

      // In modern browsers, calling audio.play() immediately returns a Promise
      audio.play().then(() => {
        // Audio is actively playing!
        console.log('[GitaAudioPlayer] Audio started playing successfully:', url);
      }).catch((playErr) => {
        clearTimeout(timer);
        console.warn('[GitaAudioPlayer] audio.play() promise rejected:', playErr);
        finish(false);
      });
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
