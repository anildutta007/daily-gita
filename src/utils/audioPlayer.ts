// Audio Player & Hybrid Recitation Service
// Uses pre-rendered Studio-Grade Indian Neural Audio (.mp3) when available,
// seamlessly falling back to in-browser Web Speech synthesis if offline or blocked.
// Guarantees strict single-audio concurrency and resilient error handling.

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
    // Generate unique playId for this invocation to prevent overlapping tracks
    const playId = ++this.currentPlayId;

    // Immediately stop any currently playing or scheduled audio
    this.stopInternal();

    // Determine target audio file path based on language choice
    const isHindiTarget = params.language === 'sanskrit_then_hindi';
    const langSuffix = isHindiTarget ? 'hi' : 'en';

    // Support both root-relative path and Vite base path (e.g. on GitHub pages or local dev)
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const audioUrl = `${normalizedBase}audio/verses/ch${params.chapter}_v${params.verse}_${langSuffix}.mp3`;

    let playedSuccessfully = false;

    try {
      playedSuccessfully = await this.playAudioUrl(audioUrl, playId);
    } catch (e) {
      console.warn(`[GitaAudioPlayer] Neural audio error for ch${params.chapter}_v${params.verse}:`, e);
      playedSuccessfully = false;
    }

    // Check if this playback request was superseded while loading
    if (playId !== this.currentPlayId) {
      return;
    }

    // If neural mp3 audio succeeded, we're done!
    if (playedSuccessfully) {
      return;
    }

    // Otherwise, immediately fallback to browser speech synthesis
    console.log(`[GitaAudioPlayer] Falling back to Web Speech synthesis for ch${params.chapter}_v${params.verse}`);
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

      const finish = (result: boolean) => {
        if (!settled) {
          settled = true;
          audio.oncanplaythrough = null;
          audio.onended = null;
          audio.onerror = null;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve(result);
        }
      };

      // Safety timeout: if audio takes longer than 4.5 seconds to buffer/respond, trigger fallback
      const timer = setTimeout(() => {
        if (!settled) {
          console.warn('[GitaAudioPlayer] Audio load timeout on', url);
          try {
            audio.pause();
            audio.src = '';
          } catch (e) {}
          finish(false);
        }
      }, 4500);

      audio.onended = () => {
        clearTimeout(timer);
        finish(playId === this.currentPlayId);
      };

      audio.onerror = (e) => {
        clearTimeout(timer);
        console.warn('[GitaAudioPlayer] Audio load failed for url:', url, e);
        finish(false);
      };

      audio.oncanplaythrough = () => {
        if (playId !== this.currentPlayId) {
          clearTimeout(timer);
          try { audio.pause(); } catch (e) {}
          finish(false);
          return;
        }

        // Execute play() directly
        audio.play().then(() => {
          // Playing started normally!
        }).catch((err) => {
          clearTimeout(timer);
          console.warn('[GitaAudioPlayer] audio.play() rejected (autoplay or device policy):', err);
          finish(false);
        });
      };

      audio.src = url;
      audio.load();
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
