import React, { useState, useEffect } from 'react';
import { Shloka, UserProfile } from '../types';
import { CHAPTER_METADATA } from '../data/chapterMeta';
import { gitaSpeech } from '../utils/speech';
import { ambientSound } from '../utils/ambientSound';
import {
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  Globe,
  LogOut,
  List
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReadingSessionProps {
  shlokas: Shloka[];
  initialIndex: number;
  totalSessionMinutes: number;
  user: UserProfile;
  initialMode?: 'listen' | 'read';
  onFinishSession: (updatedShlokaIndex: number, completedIds: number[], minutesSpent: number) => void;
  onExitEarly: (updatedShlokaIndex: number, completedIds: number[], minutesSpent: number) => void;
}

export const ReadingSession: React.FC<ReadingSessionProps> = ({
  shlokas,
  initialIndex,
  totalSessionMinutes,
  user,
  initialMode = 'listen',
  onFinishSession,
  onExitEarly
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'bilingual' | 'english' | 'hindi'>('bilingual');
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(initialMode === 'listen');
  const [listenLanguage, setListenLanguage] = useState<'sanskrit_then_hindi' | 'sanskrit_then_english' | 'hindi_only' | 'english_only'>(
    user.preferredLanguage === 'hindi' ? 'sanskrit_then_hindi' : 'sanskrit_then_english'
  );
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(user.voiceGender || 'male');
  
  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(user.ambientSound !== 'none');
  const [ambientType, setAmbientType] = useState(user.ambientSound);

  // Time tracking
  const [secondsRemaining, setSecondsRemaining] = useState(totalSessionMinutes * 60);

  // Bookmarks & Completed in current session
  const [completedIds, setCompletedIds] = useState<number[]>(user.completedShlokaIds || []);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(user.bookmarkedIds || []);

  const currentShloka: Shloka = shlokas[currentIdx] || shlokas[0];
  const chapterMeta = CHAPTER_METADATA.find(c => c.chapter === currentShloka?.chapter);

  // Initialize ambient music
  useEffect(() => {
    if (ambientPlaying && ambientType !== 'none') {
      ambientSound.play(ambientType, 0.2);
    }
    return () => {
      ambientSound.stop();
      gitaSpeech.cancel();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAmbient = () => {
    if (ambientPlaying) {
      ambientSound.stop();
      setAmbientPlaying(false);
    } else {
      const modeToPlay = ambientType === 'none' ? 'flute' : ambientType;
      setAmbientType(modeToPlay);
      ambientSound.play(modeToPlay, 0.2);
      setAmbientPlaying(true);
    }
  };

  const handleAmbientChange = (mode: 'flute' | 'tanpura' | 'om' | 'none') => {
    setAmbientType(mode);
    if (mode === 'none') {
      ambientSound.stop();
      setAmbientPlaying(false);
    } else {
      ambientSound.play(mode, 0.2);
      setAmbientPlaying(true);
    }
  };

  // Listen mode TTS logic
  // Recite a specific shloka index
  const playShloka = async (idxToPlay: number, autoAdvance: boolean) => {
    const targetShloka = shlokas[idxToPlay];
    if (!targetShloka) return;

    setIsSpeaking(true);
    try {
      if (listenLanguage === 'sanskrit_then_english') {
        // Step 1: Sanskrit verse
        await gitaSpeech.speak({
          text: targetShloka.sanskrit,
          lang: 'hi',
          gender: voiceGender,
          rate: 0.84
        });
        // Step 2: English meaning
        await gitaSpeech.speak({
          text: targetShloka.englishMeaning,
          lang: 'en',
          gender: voiceGender,
          rate: 0.92
        });
        // Step 3: Inner Reflection
        if (targetShloka.commentaryEnglish) {
          await gitaSpeech.speak({
            text: `Inner Reflection: ${targetShloka.commentaryEnglish}`,
            lang: 'en',
            gender: voiceGender,
            rate: 0.90
          });
        }
      } else if (listenLanguage === 'sanskrit_then_hindi') {
        // Step 1: Sanskrit verse
        await gitaSpeech.speak({
          text: targetShloka.sanskrit,
          lang: 'hi',
          gender: voiceGender,
          rate: 0.84
        });
        // Step 2: Hindi Bhavarth
        await gitaSpeech.speak({
          text: targetShloka.hindiMeaning,
          lang: 'hi',
          gender: voiceGender,
          rate: 0.88
        });
        // Step 3: Inner Reflection (Chintan)
        if (targetShloka.commentaryHindi) {
          await gitaSpeech.speak({
            text: `चिन्तन: ${targetShloka.commentaryHindi}`,
            lang: 'hi',
            gender: voiceGender,
            rate: 0.86
          });
        }
      } else if (listenLanguage === 'english_only') {
        await gitaSpeech.speak({
          text: `${targetShloka.englishMeaning}. Inner Reflection: ${targetShloka.commentaryEnglish || ''}`,
          lang: 'en',
          gender: voiceGender,
          rate: 0.92
        });
      } else if (listenLanguage === 'hindi_only') {
        await gitaSpeech.speak({
          text: `${targetShloka.hindiMeaning}। चिन्तन: ${targetShloka.commentaryHindi || ''}`,
          lang: 'hi',
          gender: voiceGender,
          rate: 0.88
        });
      }

      // Mark current verse as completed
      if (!completedIds.includes(targetShloka.id)) {
        setCompletedIds(prev => Array.from(new Set([...prev, targetShloka.id])));
      }

      // Automatic advance in continuous verse mode
      if (autoAdvance) {
        if (idxToPlay < shlokas.length - 1) {
          // Meditative pause between verses
          await new Promise(r => setTimeout(r, 900));
          setCurrentIdx(idxToPlay + 1);
        } else {
          setIsSpeaking(false);
          handleSessionCompletion();
        }
      }
    } catch (err) {
      console.warn('Speech recitation error:', err);
    } finally {
      if (!autoAdvance || idxToPlay >= shlokas.length - 1) {
        setIsSpeaking(false);
      }
    }
  };

  // If in Continuous Verse Mode, automatically start chanting when loaded or when index changes
  useEffect(() => {
    if (isContinuousMode) {
      playShloka(currentIdx, true);
    }
    return () => {
      gitaSpeech.cancel();
    };
  }, [currentIdx, isContinuousMode, listenLanguage, voiceGender]);

  const handleToggleListen = async () => {
    if (isSpeaking) {
      gitaSpeech.cancel();
      setIsSpeaking(false);
      setIsContinuousMode(false); // Pausing turns off continuous auto-advance
      return;
    }

    // When clicking play, toggle continuous mode if user desires continuous listening
    setIsContinuousMode(true);
  };

  const handleNext = () => {
    gitaSpeech.cancel();
    setIsSpeaking(false);
    if (!completedIds.includes(currentShloka.id)) {
      setCompletedIds([...completedIds, currentShloka.id]);
    }
    if (currentIdx < shlokas.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleSessionCompletion();
    }
  };

  const handlePrev = () => {
    gitaSpeech.cancel();
    setIsSpeaking(false);
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleToggleBookmark = (id: number) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter(b => b !== id));
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
    }
  };

  const handleSessionCompletion = () => {
    gitaSpeech.cancel();
    ambientSound.stop();
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });
    const finalNextIndex = Math.min(initialIndex + currentIdx + 1, 32);
    const minutesSpent = Math.max(1, Math.round((totalSessionMinutes * 60 - secondsRemaining) / 60));
    onFinishSession(finalNextIndex, completedIds, minutesSpent);
  };

  const handleExit = () => {
    gitaSpeech.cancel();
    ambientSound.stop();
    const finalNextIndex = initialIndex + currentIdx;
    const minutesSpent = Math.max(1, Math.round((totalSessionMinutes * 60 - secondsRemaining) / 60));
    onExitEarly(finalNextIndex, completedIds, minutesSpent);
  };

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Floating Control Bar */}
      <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#220a0a]/90 border border-amber-500/30 backdrop-blur-lg shadow-xl shadow-black/40">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-200/80 hover:text-amber-100 hover:bg-[#351010] transition-all"
        >
          <LogOut className="w-4 h-4 text-amber-400" />
          <span>Pause & Save</span>
        </button>

        {/* Center Progress & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#140505] border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeFormatted} left</span>
          </div>

          <div className="text-xs text-amber-200/90 font-medium">
            Verse <span className="text-amber-400 font-bold">{currentIdx + 1}</span> of {shlokas.length}
          </div>
        </div>

        {/* Ambient audio toggle pill */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleAmbient}
            title={ambientPlaying ? 'Mute sacred background' : 'Play sacred background'}
            className={`p-2 rounded-xl text-xs transition-all flex items-center gap-1.5 border ${
              ambientPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-[#1b0808] text-amber-200/60 border-amber-900/60 hover:text-amber-200'
            }`}
          >
            {ambientPlaying ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline capitalize">{ambientType}</span>
          </button>

          <select
            value={ambientType}
            onChange={(e) => handleAmbientChange(e.target.value as any)}
            className="bg-[#140505] text-xs text-amber-300 border border-amber-700/60 rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="flute">🪈 Bansuri Flute</option>
            <option value="tanpura">🪕 Tanpura Drone</option>
            <option value="om">🕉️ Om Frequency</option>
            <option value="none">🔇 None</option>
          </select>
        </div>
      </div>

      {/* Main Temple Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#2a0c0c] to-[#1c0808] border border-amber-500/40 p-6 sm:p-10 shadow-2xl shadow-black/80">
        
        {/* Chapter Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              CHAPTER {currentShloka.chapter} • {chapterMeta?.nameSanskrit}
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 tracking-tight">
              {chapterMeta?.nameEnglish}
            </h2>
            <div className="text-sm text-amber-300/80 font-hindi mt-0.5">
              {chapterMeta?.nameHindi}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleBookmark(currentShloka.id)}
              className={`p-2.5 rounded-full border transition-all ${
                bookmarkedIds.includes(currentShloka.id)
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-[#1b0808] border-amber-700/50 text-amber-300/60 hover:text-amber-200'
              }`}
              title="Bookmark this shloka"
            >
              <Bookmark className={`w-4 h-4 ${bookmarkedIds.includes(currentShloka.id) ? 'fill-current' : ''}`} />
            </button>
            <span className="px-3 py-1 rounded-full bg-[#f59e0b] text-[#1a0808] text-xs font-bold shadow-md">
              Verse {currentShloka.verse}
            </span>
          </div>
        </div>

        {/* Golden Lotus Divider */}
        <div className="my-6 flex items-center justify-center gap-3">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
          <span className="text-amber-400 text-sm select-none">🪷</span>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
        </div>

        {/* Parchment-coloured Sanskrit Shloka Box with Rotating Faint Om Behind */}
        <div className="relative overflow-hidden rounded-2xl bg-[#faf3e0] text-[#2c1810] p-8 sm:p-10 shadow-xl border border-amber-300/80 text-center my-6">
          {/* Rotating Faint Om In Background */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.09] text-amber-900 text-[180px] sm:text-[230px] font-serif leading-none animate-spin-slow">
            ॐ
          </div>

          <p className="relative z-10 font-serif text-2xl sm:text-3xl md:text-4xl leading-relaxed sm:leading-loose font-bold tracking-wide text-[#3a1d0f] whitespace-pre-line select-text">
            {currentShloka.sanskrit}
          </p>
        </div>

        {/* Transliteration */}
        <p className="text-center font-serif italic text-sm sm:text-base text-amber-200/80 max-w-2xl mx-auto leading-relaxed whitespace-pre-line my-4">
          {currentShloka.transliteration}
        </p>

        {/* Glowing Listen Button & Language Selection */}
        <div className="my-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#1d0707] border border-amber-500/30">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Glowing Listen Button as in screenshot */}
            <button
              onClick={handleToggleListen}
              className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-lg ${
                isSpeaking
                  ? 'bg-amber-400 text-slate-950 shadow-amber-400/50 ring-4 ring-amber-400/40 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-amber-500/40 hover:shadow-amber-400/60 hover:scale-105 active:scale-95'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause {isContinuousMode ? 'Continuous Audio' : 'Recitation'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 fill-current" />
                  <span>{isContinuousMode ? 'Resume Continuous Audio' : 'Play Continuous Verses'}</span>
                </>
              )}
            </button>

            {/* Continuous Auto-Advance Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#140505] border border-amber-500/40 text-[11px] text-amber-300">
              <span className={`w-2 h-2 rounded-full ${isContinuousMode && isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
              <span>{isContinuousMode ? 'Hands-Free Auto Advance ON' : 'Self-Paced'}</span>
            </div>

            {/* Listen Language Selector */}
            <select
              value={listenLanguage}
              onChange={(e) => {
                gitaSpeech.cancel();
                setIsSpeaking(false);
                setListenLanguage(e.target.value as any);
              }}
              className="bg-[#2a0c0c] border border-amber-500/40 rounded-full px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
            >
              <option value="sanskrit_then_hindi">Sanskrit chant + हिंदी भावार्थ</option>
              <option value="sanskrit_then_english">Sanskrit chant + English meaning</option>
              <option value="english_only">English voice only</option>
              <option value="hindi_only">हिंदी केवल (Hindi only)</option>
            </select>

            {/* Quick Male / Female Voice Switcher */}
            <div className="inline-flex rounded-full bg-[#200808] border border-amber-500/40 p-0.5">
              <button
                type="button"
                onClick={() => {
                  gitaSpeech.cancel();
                  setIsSpeaking(false);
                  setVoiceGender('male');
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  voiceGender === 'male'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-300/70 hover:text-amber-200'
                }`}
                title="Male Voice (Madhur/Prabhat)"
              >
                🧔 Male
              </button>
              <button
                type="button"
                onClick={() => {
                  gitaSpeech.cancel();
                  setIsSpeaking(false);
                  setVoiceGender('female');
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  voiceGender === 'female'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-300/70 hover:text-amber-200'
                }`}
                title="Female Voice (Swara/Neerja)"
              >
                👩 Female
              </button>
            </div>
          </div>

          <div className="text-xs text-amber-300/80 font-medium">
            Theme: <strong className="text-amber-400">{currentShloka.theme || 'Spiritual Awakening'}</strong>
          </div>
        </div>

        {/* Bilingual / English / Hindi Pill Buttons (Redesigned as requested) */}
        <div className="my-6">
          <div className="flex items-center justify-center p-1 rounded-full bg-[#170505] border border-amber-500/30 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('bilingual')}
              className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'bilingual'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'text-amber-200/70 hover:text-amber-100'
              }`}
            >
              Bilingual
            </button>
            <button
              onClick={() => setActiveTab('english')}
              className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'english'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'text-amber-200/70 hover:text-amber-100'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveTab('hindi')}
              className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold font-hindi transition-all ${
                activeTab === 'hindi'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'text-amber-200/70 hover:text-amber-100'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Meaning Content Box with Gold Border Accent */}
        <div className="space-y-4 pt-2">
          {(activeTab === 'bilingual' || activeTab === 'english') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1d0707] border-l-4 border-amber-500 border border-amber-500/20 shadow-md">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                ENGLISH TRANSLATION
              </div>
              <p className="text-amber-100 text-base sm:text-lg leading-relaxed font-serif">
                {currentShloka.englishMeaning}
              </p>
              {currentShloka.commentaryEnglish && (
                <div className="mt-3 pt-3 border-t border-amber-900/50 text-xs sm:text-sm text-amber-300/80 italic font-serif">
                  <span className="text-amber-400 font-semibold not-italic">Inner Reflection: </span>
                  {currentShloka.commentaryEnglish}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'bilingual' || activeTab === 'hindi') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1d0707] border-l-4 border-amber-500 border border-amber-500/20 shadow-md font-hindi">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 font-sans">
                हिंदी सरल भावार्थ
              </div>
              <p className="text-amber-100 text-lg sm:text-xl leading-relaxed">
                {currentShloka.hindiMeaning}
              </p>
              {currentShloka.commentaryHindi && (
                <div className="mt-3 pt-3 border-t border-amber-900/50 text-xs sm:text-sm text-amber-300/80 italic">
                  <span className="text-amber-400 font-semibold not-italic font-sans">चिन्तन: </span>
                  {currentShloka.commentaryHindi}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-amber-900/60 flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${
              currentIdx === 0
                ? 'opacity-30 cursor-not-allowed border-amber-950 text-amber-900'
                : 'border-amber-600/50 bg-[#200808] text-amber-200 hover:bg-[#2e0c0c] hover:border-amber-500'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Verse</span>
          </button>

          <div className="text-xs text-amber-300/60 hidden sm:block">
            {currentIdx + 1} of {shlokas.length} in this session
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition-all transform active:scale-95"
          >
            <span>
              {currentIdx === shlokas.length - 1 ? 'Complete Session 🌟' : 'Next Verse'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Sacred Chant */}
        <div className="mt-8 text-center text-xs tracking-widest text-amber-400/70 uppercase font-serif">
          ॥ हरिः ॐ तत् सत् ॥
        </div>

      </div>

      {/* Verses In This Session Quick Jump Tray */}
      <div className="p-4 rounded-2xl bg-[#220a0a]/60 border border-amber-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-amber-400/80 font-semibold flex items-center gap-2">
            <List className="w-3.5 h-3.5 text-amber-400" />
            <span>Verses in this {totalSessionMinutes}-minute session</span>
          </div>
          <span className="text-xs text-amber-400 font-medium">
            Tap any verse to jump
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {shlokas.map((s, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = completedIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => {
                  gitaSpeech.cancel();
                  setIsSpeaking(false);
                  setCurrentIdx(idx);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : isDone
                    ? 'bg-[#1e130d] border-emerald-500/50 text-emerald-300'
                    : 'bg-[#140505] border-amber-900/60 text-amber-200/60 hover:text-amber-200'
                }`}
              >
                <span>Ch.{s.chapter} V.{s.verse}</span>
                {isDone && <CheckCircle className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
