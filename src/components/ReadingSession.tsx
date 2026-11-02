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
  
  // Animation state for 3D page flip
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

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
          rate: 0.84
        });
        // Step 2: English meaning
        await gitaSpeech.speak({
          text: targetShloka.englishMeaning,
          lang: 'en',
          rate: 0.92
        });
        // Step 3: Inner Reflection
        if (targetShloka.commentaryEnglish) {
          await gitaSpeech.speak({
            text: `Inner Reflection: ${targetShloka.commentaryEnglish}`,
            lang: 'en',
            rate: 0.90
          });
        }
      } else if (listenLanguage === 'sanskrit_then_hindi') {
        // Step 1: Sanskrit verse
        await gitaSpeech.speak({
          text: targetShloka.sanskrit,
          lang: 'hi',
          rate: 0.84
        });
        // Step 2: Hindi Bhavarth
        await gitaSpeech.speak({
          text: targetShloka.hindiMeaning,
          lang: 'hi',
          rate: 0.88
        });
        // Step 3: Inner Reflection (Chintan)
        if (targetShloka.commentaryHindi) {
          await gitaSpeech.speak({
            text: `चिन्तन: ${targetShloka.commentaryHindi}`,
            lang: 'hi',
            rate: 0.86
          });
        }
      } else if (listenLanguage === 'english_only') {
        await gitaSpeech.speak({
          text: `${targetShloka.englishMeaning}. Inner Reflection: ${targetShloka.commentaryEnglish || ''}`,
          lang: 'en',
          rate: 0.92
        });
      } else if (listenLanguage === 'hindi_only') {
        await gitaSpeech.speak({
          text: `${targetShloka.hindiMeaning}। चिन्तन: ${targetShloka.commentaryHindi || ''}`,
          lang: 'hi',
          rate: 0.88
        });
      }

      // Mark current verse as completed
      if (!completedIds.includes(targetShloka.id)) {
        setCompletedIds(prev => Array.from(new Set([...prev, targetShloka.id])));
      }

      // Automatic advance with 3D desk calendar page flip
      if (autoAdvance) {
        if (idxToPlay < shlokas.length - 1) {
          await new Promise(r => setTimeout(r, 700));
          triggerFlip('next', idxToPlay + 1);
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
  }, [currentIdx, isContinuousMode, listenLanguage]);

  const triggerFlip = (direction: 'next' | 'prev', newIndex: number) => {
    setFlipDirection(direction);
    setTimeout(() => {
      setCurrentIdx(newIndex);
      setTimeout(() => {
        setFlipDirection(null);
      }, 50);
    }, 280);
  };

  const handleToggleListen = async () => {
    if (isSpeaking) {
      gitaSpeech.cancel();
      setIsSpeaking(false);
      setIsContinuousMode(false);
      return;
    }

    setIsContinuousMode(true);
  };

  const handleNext = () => {
    gitaSpeech.cancel();
    setIsSpeaking(false);
    if (!completedIds.includes(currentShloka.id)) {
      setCompletedIds([...completedIds, currentShloka.id]);
    }
    if (currentIdx < shlokas.length - 1) {
      triggerFlip('next', currentIdx + 1);
    } else {
      handleSessionCompletion();
    }
  };

  const handlePrev = () => {
    gitaSpeech.cancel();
    setIsSpeaking(false);
    if (currentIdx > 0) {
      triggerFlip('prev', currentIdx - 1);
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
    const finalNextIndex = Math.min(initialIndex + currentIdx + 1, 700);
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

      {/* ========================================================================= */}
      {/* DESK CALENDAR STAND INTERFACE                                            */}
      {/* ========================================================================= */}
      <div className="relative pt-6 pb-4">
        {/* Desk Calendar Wooden / Brass Header Spine */}
        <div className="max-w-3xl mx-auto relative z-20">
          <div className="h-7 bg-gradient-to-r from-[#2e130c] via-[#4d2417] to-[#2e130c] rounded-t-2xl border-t-2 border-x-2 border-amber-600/70 shadow-lg flex items-center justify-around px-8">
            {/* Metallic Brass Spiral Binding Rings */}
            {[...Array(9)].map((_, i) => (
              <div key={i} className="relative -top-2 flex flex-col items-center">
                {/* Spiral Ring */}
                <div className="w-3.5 h-6 rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 shadow-md shadow-black/80" />
                {/* Ring Hole cutout */}
                <div className="w-2 h-2 rounded-full bg-[#180a08] border border-amber-900 -mt-1" />
              </div>
            ))}
          </div>
        </div>

        {/* 3D Perspective Card Container */}
        <div className="perspective-1200 max-w-3xl mx-auto">
          {/* Stacked Shadow Underlay Pages (Gives real calendar page depth) */}
          <div className="relative">
            {/* Underlay bottom shadow page */}
            <div className="absolute inset-x-2 -bottom-2 h-full rounded-b-3xl bg-[#f0e4cb] border border-amber-800/40 opacity-40 shadow-xl pointer-events-none" />
            <div className="absolute inset-x-1 -bottom-1 h-full rounded-b-3xl bg-[#f5ecda] border border-amber-800/50 opacity-70 shadow-lg pointer-events-none" />

            {/* Active Calendar Page Card with Flip Animation */}
            <div
              className={`relative rounded-b-3xl bg-[#fdfbf7] text-[#2c1810] border-2 border-amber-500/60 p-6 sm:p-10 shadow-2xl transition-all duration-300 ${
                flipDirection === 'next'
                  ? 'page-flip-next'
                  : flipDirection === 'prev'
                  ? 'page-flip-prev'
                  : ''
              }`}
            >
              {/* Paper Watermark Texture & Turning Om */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.06] text-amber-950 text-[180px] sm:text-[240px] font-serif leading-none animate-spin-slow">
                ॐ
              </div>

              {/* Calendar Page Header: Date / Chapter Pill & Verse Number */}
              <div className="flex items-start justify-between border-b-2 border-amber-800/20 pb-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-700/30 text-[11px] font-bold text-amber-900 uppercase tracking-widest">
                    <span>CHAPTER {currentShloka.chapter}</span>
                    <span>•</span>
                    <span className="font-hindi">{chapterMeta?.nameSanskrit}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[#3a1d0f] mt-1.5 tracking-tight">
                    {chapterMeta?.nameEnglish}
                  </h3>
                  <div className="text-xs text-amber-900/70 font-hindi mt-0.5">
                    {chapterMeta?.nameHindi}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {/* Calendar Desk Day/Verse Badge */}
                  <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#b45309] to-[#78350f] text-amber-100 rounded-xl px-4 py-2 border border-amber-400 shadow-md">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">VERSE</span>
                    <span className="text-2xl sm:text-3xl font-black font-sans leading-none mt-0.5">
                      {currentShloka.verse}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(currentShloka.id)}
                    className="p-1 text-amber-800/60 hover:text-amber-800 mt-1"
                    title="Bookmark this verse"
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarkedIds.includes(currentShloka.id) ? 'fill-amber-600 text-amber-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Golden Lotus Divider */}
              <div className="my-4 flex items-center justify-center gap-3">
                <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-700/30 to-transparent flex-1" />
                <span className="text-amber-700 text-sm select-none">🪷</span>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-700/30 to-transparent flex-1" />
              </div>

              {/* Sanskrit Shloka on Card */}
              <div className="my-6 text-center space-y-4">
                <p className="font-serif text-2xl sm:text-3xl md:text-4xl leading-relaxed sm:leading-loose font-bold tracking-wide text-[#35180c] whitespace-pre-line select-text">
                  {currentShloka.sanskrit}
                </p>

                {/* Transliteration */}
                <p className="font-serif italic text-sm sm:text-base text-amber-900/80 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
                  {currentShloka.transliteration}
                </p>
              </div>

              {/* Glowing Audio Bar directly on Calendar card */}
              <div className="my-6 p-3.5 rounded-2xl bg-[#f4ebe1] border border-amber-700/30 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleToggleListen}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md ${
                      isSpeaking
                        ? 'bg-amber-400 text-slate-950 shadow-amber-400/50 ring-4 ring-amber-400/40 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-amber-500/40 hover:shadow-amber-400/60 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 fill-current" />
                        <span>{isContinuousMode ? 'Continuous Audio' : 'Listen'}</span>
                      </>
                    )}
                  </button>

                  <select
                    value={listenLanguage}
                    onChange={(e) => {
                      gitaSpeech.cancel();
                      setIsSpeaking(false);
                      setListenLanguage(e.target.value as any);
                    }}
                    className="bg-[#faf3e8] border border-amber-700/40 rounded-full px-3 py-1.5 text-xs text-[#35180c] font-medium focus:outline-none focus:border-amber-600"
                  >
                    <option value="sanskrit_then_hindi">Sanskrit + हिंदी भावार्थ + चिन्तन</option>
                    <option value="sanskrit_then_english">Sanskrit + English + Reflection</option>
                    <option value="english_only">English voice only</option>
                    <option value="hindi_only">हिंदी केवल (Hindi only)</option>
                  </select>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebdccb] border border-amber-700/30 text-xs font-semibold text-[#5a311b]">
                    <span>👩 Natural Female Voice</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#693d24] font-medium">
                  {isContinuousMode ? '🔄 Auto Flip Active' : '👆 Tap to flip'}
                </div>
              </div>

              {/* Translation Pill Toggle */}
              <div className="my-4">
                <div className="flex items-center justify-center p-1 rounded-full bg-[#f0e4cb] border border-amber-700/30 max-w-sm mx-auto">
                  <button
                    onClick={() => setActiveTab('bilingual')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
                      activeTab === 'bilingual'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-[#5a311b] hover:text-black'
                    }`}
                  >
                    Bilingual
                  </button>
                  <button
                    onClick={() => setActiveTab('english')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
                      activeTab === 'english'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-[#5a311b] hover:text-black'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setActiveTab('hindi')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold font-hindi transition-all ${
                      activeTab === 'hindi'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-[#5a311b] hover:text-black'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>

              {/* Translation and Inner Reflection on Calendar Page */}
              <div className="space-y-4 pt-2">
                {(activeTab === 'bilingual' || activeTab === 'english') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#f7f0e3] border-l-4 border-amber-600 border border-amber-700/20 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1.5">
                      ENGLISH TRANSLATION
                    </div>
                    <p className="text-[#35180c] text-base sm:text-lg leading-relaxed font-serif">
                      {currentShloka.englishMeaning}
                    </p>
                    {currentShloka.commentaryEnglish && (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-800/15 text-xs sm:text-sm text-amber-900/85 italic font-serif">
                        <span className="text-amber-800 font-bold not-italic">Inner Reflection: </span>
                        {currentShloka.commentaryEnglish}
                      </div>
                    )}
                  </div>
                )}

                {(activeTab === 'bilingual' || activeTab === 'hindi') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#f7f0e3] border-l-4 border-amber-600 border border-amber-700/20 shadow-sm font-hindi">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1.5 font-sans">
                      हिंदी सरल भावार्थ
                    </div>
                    <p className="text-[#35180c] text-lg sm:text-xl leading-relaxed">
                      {currentShloka.hindiMeaning}
                    </p>
                    {currentShloka.commentaryHindi && (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-800/15 text-xs sm:text-sm text-amber-900/85 italic">
                        <span className="text-amber-800 font-bold not-italic font-sans">चिन्तन: </span>
                        {currentShloka.commentaryHindi}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Flip Page Navigation Controls */}
              <div className="mt-8 pt-5 border-t-2 border-amber-800/20 flex items-center justify-between gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all ${
                    currentIdx === 0
                      ? 'opacity-30 cursor-not-allowed border-amber-800/20 text-amber-800/40'
                      : 'border-amber-700/40 bg-[#f0e4cb] text-[#3a1d0f] hover:bg-[#e6d8bc] active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Flip Back</span>
                </button>

                <div className="text-xs text-amber-900/60 font-serif font-bold">
                  Card {currentIdx + 1} of {shlokas.length}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-900/30 transition-all transform active:scale-95"
                >
                  <span>{currentIdx === shlokas.length - 1 ? 'Finish Session 🌟' : 'Flip Next Page ➔'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Sacred Footer Quote on Card */}
              <div className="mt-6 text-center text-xs tracking-widest text-amber-900/50 uppercase font-serif">
                ॥ हरिः ॐ तत् सत् ॥
              </div>
            </div>
          </div>
        </div>

        {/* Desk Calendar Wooden Base Stand Bottom */}
        <div className="max-w-3xl mx-auto">
          <div className="h-4 bg-gradient-to-r from-[#200b06] via-[#3a180e] to-[#200b06] rounded-b-2xl border-b-2 border-x-2 border-amber-900/80 shadow-2xl mx-3" />
        </div>
      </div>

      {/* Verses In This Session Quick Jump Tray */}
      <div className="p-4 rounded-2xl bg-[#220a0a]/60 border border-amber-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-amber-400/80 font-semibold flex items-center gap-2">
            <List className="w-3.5 h-3.5 text-amber-400" />
            <span>Desk Calendar Cards in this session ({shlokas.length} Total)</span>
          </div>
          <span className="text-xs text-amber-400 font-medium">
            Tap to flip directly to card
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
                  triggerFlip(idx > currentIdx ? 'next' : 'prev', idx);
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
