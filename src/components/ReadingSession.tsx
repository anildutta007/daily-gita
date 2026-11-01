import React, { useState, useEffect } from 'react';
import { Shloka, UserProfile } from '../types';
import { CHAPTER_METADATA } from '../data/chapterMeta';
import { gitaSpeech } from '../utils/speech';
import { ambientSound } from '../utils/ambientSound';
import {
  Play,
  Pause,
  RotateCcw,
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
  Sliders,
  LogOut,
  Share2,
  List
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReadingSessionProps {
  shlokas: Shloka[];
  initialIndex: number;
  totalSessionMinutes: number;
  user: UserProfile;
  onFinishSession: (updatedShlokaIndex: number, completedIds: number[], minutesSpent: number) => void;
  onExitEarly: (updatedShlokaIndex: number, completedIds: number[], minutesSpent: number) => void;
}

export const ReadingSession: React.FC<ReadingSessionProps> = ({
  shlokas,
  initialIndex,
  totalSessionMinutes,
  user,
  onFinishSession,
  onExitEarly
}) => {
  const [currentIdx, setCurrentIdx] = useState(0); // index inside current session shlokas
  const [activeTab, setActiveTab] = useState<'bilingual' | 'english' | 'hindi'>('bilingual');
  const [listenLanguage, setListenLanguage] = useState<'sanskrit_then_hindi' | 'sanskrit_then_english' | 'hindi_only' | 'english_only'>(
    user.preferredLanguage === 'hindi' ? 'sanskrit_then_hindi' : 'sanskrit_then_english'
  );
  
  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(user.ambientSound !== 'none');
  const [ambientType, setAmbientType] = useState(user.ambientSound);

  // Time tracking
  const [secondsRemaining, setSecondsRemaining] = useState(totalSessionMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Bookmarks & Completed in current session
  const [completedIds, setCompletedIds] = useState<number[]>(user.completedShlokaIds || []);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(user.bookmarkedIds || []);
  const [showShlokaList, setShowShlokaList] = useState(false);

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
    if (!isTimerRunning) return;
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
  }, [isTimerRunning]);

  // Handle ambient sound switch
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
  const handleToggleListen = async () => {
    if (isSpeaking) {
      gitaSpeech.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      if (listenLanguage === 'sanskrit_then_english') {
        // Step 1: Sanskrit verse with reverent clarity
        await gitaSpeech.speak({
          text: currentShloka.sanskrit,
          lang: 'hi',
          rate: 0.84
        });
        // Step 2: English meaning with warm, expressive tone
        await gitaSpeech.speak({
          text: currentShloka.englishMeaning,
          lang: 'en',
          rate: 0.92
        });
      } else if (listenLanguage === 'sanskrit_then_hindi') {
        // Step 1: Sanskrit verse
        await gitaSpeech.speak({
          text: currentShloka.sanskrit,
          lang: 'hi',
          rate: 0.84
        });
        // Step 2: Hindi Bhavarth with natural cadence
        await gitaSpeech.speak({
          text: currentShloka.hindiMeaning,
          lang: 'hi',
          rate: 0.88
        });
      } else if (listenLanguage === 'english_only') {
        await gitaSpeech.speak({
          text: `${currentShloka.englishMeaning}. ${currentShloka.commentaryEnglish || ''}`,
          lang: 'en',
          rate: 0.92
        });
      } else if (listenLanguage === 'hindi_only') {
        await gitaSpeech.speak({
          text: `${currentShloka.hindiMeaning}। ${currentShloka.commentaryHindi || ''}`,
          lang: 'hi',
          rate: 0.88
        });
      }
    } catch (err) {
      console.warn('Speech recitation error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Next shloka
  const handleNext = () => {
    gitaSpeech.cancel();
    setIsSpeaking(false);
    // Mark current shloka completed
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
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    // Calculate global index to resume from next time
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

  // Format time remaining mm:ss
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Top Floating Control Bar */}
      <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-lg shadow-xl">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Pause & Save</span>
        </button>

        {/* Center Progress & Timer */}
        <div className="flex items-center gap-3">
          {/* Timer pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>{timeFormatted} left</span>
          </div>

          {/* Shloka counter */}
          <div className="text-xs text-slate-300 font-medium">
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
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            {ambientPlaying ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline capitalize">{ambientType}</span>
          </button>

          {/* Sound selector dropdown */}
          <select
            value={ambientType}
            onChange={(e) => handleAmbientChange(e.target.value as any)}
            className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="flute">🪈 Bansuri Flute</option>
            <option value="tanpura">🪕 Tanpura Drone</option>
            <option value="om">🕉️ Om Frequency</option>
            <option value="none">🔇 None</option>
          </select>
        </div>
      </div>

      {/* Main Scripture Contemplation Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/20 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        
        {/* Subtle Decorative Golden Mandala / Arc in BG */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Chapter & Verse Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              Chapter {currentShloka.chapter}: {chapterMeta?.nameSanskrit} ({chapterMeta?.nameTransliteration})
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              {chapterMeta?.nameEnglish}
            </h2>
            <div className="text-xs text-slate-400 font-hindi">
              {chapterMeta?.nameHindi}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleBookmark(currentShloka.id)}
              className={`p-2.5 rounded-xl border transition-all ${
                bookmarkedIds.includes(currentShloka.id)
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Bookmark this shloka"
            >
              <Bookmark className={`w-4 h-4 ${bookmarkedIds.includes(currentShloka.id) ? 'fill-current' : ''}`} />
            </button>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-amber-300 font-mono text-xs font-semibold border border-slate-700">
              Verse {currentShloka.verse}
            </span>
          </div>
        </div>

        {/* Primary Sacred Sanskrit Devanagari Script */}
        <div className="my-6 text-center space-y-4">
          <div className="p-6 sm:p-8 rounded-2xl bg-amber-950/20 border border-amber-500/25 shadow-inner">
            <p className="font-serif text-2xl sm:text-3xl md:text-4xl text-amber-100 leading-relaxed font-bold tracking-wide whitespace-pre-line drop-shadow-sm select-text">
              {currentShloka.sanskrit}
            </p>
          </div>

          {/* Transliteration */}
          <p className="font-serif italic text-sm sm:text-base text-amber-300/80 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
            {currentShloka.transliteration}
          </p>

          {currentShloka.wordMeanings && (
            <div className="pt-2 text-xs text-slate-400 font-mono max-w-xl mx-auto border-t border-slate-800/60">
              <span className="text-amber-400/80 font-bold">Word Meanings: </span>
              {currentShloka.wordMeanings}
            </div>
          )}
        </div>

        {/* Listen Mode Bar (English & Hindi) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 my-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleToggleListen}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md ${
                isSpeaking
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Recitation</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Listen Mode</span>
                </>
              )}
            </button>

            {/* Language Selection for TTS */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={listenLanguage}
                onChange={(e) => {
                  gitaSpeech.cancel();
                  setIsSpeaking(false);
                  setListenLanguage(e.target.value as any);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
              >
                <option value="sanskrit_then_english">Chant Sanskrit + English Meaning</option>
                <option value="sanskrit_then_hindi">Chant Sanskrit + हिंदी भावार्थ</option>
                <option value="english_only">English Voice Only</option>
                <option value="hindi_only">हिंदी केवल (Hindi Voice Only)</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Theme: <strong className="text-amber-300">{currentShloka.theme || 'Spiritual Awakening'}</strong></span>
          </div>
        </div>

        {/* Translation Mode Tabs: Bilingual / English / Hindi */}
        <div className="mt-8 space-y-4">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('bilingual')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'bilingual'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Bilingual (Both)
            </button>
            <button
              onClick={() => setActiveTab('english')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'english'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              English Translation
            </button>
            <button
              onClick={() => setActiveTab('hindi')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all font-hindi ${
                activeTab === 'hindi'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              हिंदी भावार्थ
            </button>
          </div>

          {/* Meaning Content Box */}
          <div className="space-y-4 pt-2">
            {(activeTab === 'bilingual' || activeTab === 'english') && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>English Translation</span>
                </div>
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {currentShloka.englishMeaning}
                </p>
                {currentShloka.commentaryEnglish && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs sm:text-sm text-slate-400 italic">
                    <span className="text-amber-400/90 font-semibold not-italic">Inner Reflection: </span>
                    {currentShloka.commentaryEnglish}
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'bilingual' || activeTab === 'hindi') && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 font-hindi">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>हिंदी सरल भावार्थ</span>
                </div>
                <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
                  {currentShloka.hindiMeaning}
                </p>
                {currentShloka.commentaryHindi && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs sm:text-sm text-slate-400 italic">
                    <span className="text-amber-400/90 font-semibold not-italic font-sans">चिन्तन: </span>
                    {currentShloka.commentaryHindi}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              currentIdx === 0
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                : 'border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous Verse</span>
          </button>

          <div className="text-xs text-slate-400 hidden sm:block">
            {currentIdx + 1} of {shlokas.length} in this {totalSessionMinutes}-minute session
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
          >
            <span>
              {currentIdx === shlokas.length - 1 ? 'Complete Session 🌟' : 'Next Verse'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Verses In This Session Quick Jump Tray */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
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
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-sm'
                    : isDone
                    ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
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
