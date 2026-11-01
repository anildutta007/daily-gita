import React, { useState, useEffect } from 'react';
import { UserProfile, Shloka } from './types';
import {
  getStoredProfile,
  saveStoredProfile,
  removeStoredProfile,
  calculateShlokasForTime
} from './utils/storage';
import { AuthModal } from './components/AuthModal';
import { TimeSelector } from './components/TimeSelector';
import { ReadingSession } from './components/ReadingSession';
import { ProfileModal } from './components/ProfileModal';
import { ChapterBrowserModal } from './components/ChapterBrowserModal';
import { BookOpen, LogOut } from 'lucide-react';
import chariotBanner from './assets/krishna-arjuna-banner.png';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Session state
  const [activeSession, setActiveSession] = useState<{
    durationMinutes: number;
    shlokas: Shloka[];
    initialIndex: number;
    sessionMode: 'listen' | 'read';
  } | null>(null);

  // Initialize profile on mount
  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) {
      const today = new Date().toISOString().split('T')[0];
      if (stored.lastActiveDate !== today) {
        const lastDate = new Date(stored.lastActiveDate);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          stored.streakDays = (stored.streakDays || 1) + 1;
        } else if (diffDays > 1) {
          stored.streakDays = 1;
        }
        stored.lastActiveDate = today;
        saveStoredProfile(stored);
      }
      setUser(stored);
    } else {
      setIsAuthOpen(true);
    }
  }, []);

  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    saveStoredProfile(updated);
  };

  const handleLogout = () => {
    removeStoredProfile();
    setUser(null);
    setActiveSession(null);
    setIsProfileOpen(false);
    setIsAuthOpen(true);
  };

  const handleLogin = (newProfile: UserProfile) => {
    setUser(newProfile);
    saveStoredProfile(newProfile);
    setIsAuthOpen(false);
  };

  const handleStartSession = (durationMinutes: number, sessionMode: 'listen' | 'read' = 'listen') => {
    if (!user) return;
    const { shlokas, startIndex } = calculateShlokasForTime(
      durationMinutes,
      user.readingSpeed,
      user.currentShlokaIndex
    );

    setActiveSession({
      durationMinutes,
      shlokas,
      initialIndex: startIndex,
      sessionMode
    });
  };

  const handleFinishSession = (
    updatedShlokaIndex: number,
    completedIds: number[],
    minutesSpent: number
  ) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      currentShlokaIndex: updatedShlokaIndex,
      completedShlokaIds: Array.from(new Set([...user.completedShlokaIds, ...completedIds])),
      totalMinutesSpent: user.totalMinutesSpent + minutesSpent,
      lastActiveDate: new Date().toISOString().split('T')[0],
      history: [
        {
          date: new Date().toISOString().split('T')[0],
          durationMinutes: minutesSpent,
          shlokasCovered: completedIds.length
        },
        ...user.history.slice(0, 19)
      ]
    };
    handleUpdateUser(updated);
    setActiveSession(null);
  };

  const handleExitEarly = (
    updatedShlokaIndex: number,
    completedIds: number[],
    minutesSpent: number
  ) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      currentShlokaIndex: updatedShlokaIndex,
      completedShlokaIds: Array.from(new Set([...user.completedShlokaIds, ...completedIds])),
      totalMinutesSpent: user.totalMinutesSpent + minutesSpent,
    };
    handleUpdateUser(updated);
    setActiveSession(null);
  };

  const handleSelectShloka = (shlokaIndex: number) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      currentShlokaIndex: shlokaIndex
    };
    handleUpdateUser(updated);
  };

  return (
    <div className="min-h-screen bg-[#140505] text-[#fbf5e6] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Temple Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#1e0707]/95 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-lg shadow-black/50">
        <div className="flex items-center gap-3">
          {/* Om Emblem at top */}
          <div className="w-10 h-10 rounded-full bg-[#f59e0b] flex items-center justify-center text-[#1a0808] font-serif text-2xl font-bold shadow-md shadow-amber-500/40">
            ॐ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-lg sm:text-xl text-amber-200 tracking-wide">
                Daily Gita
              </span>
            </div>
            <p className="text-[11px] text-amber-300/70 font-hindi">
              श्रीमद्भगवद्गीता • sacred shlokas for your daily practice
            </p>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* 18 Chapters button */}
              <button
                onClick={() => setIsBrowserOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2a0e0e] border border-amber-600/40 text-xs font-semibold text-amber-200 hover:text-amber-100 hover:border-amber-400 transition-all"
                title="Browse all 18 chapters"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">18 Chapters</span>
              </button>

              {/* Profile Pill */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2a0e0e] border border-amber-600/40 text-amber-200 text-xs font-semibold hover:border-amber-400 transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-[#f59e0b] text-[#1a0808] flex items-center justify-center font-bold text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.name}</span>
              </button>

              {/* Direct Logout shortcut */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-[#2a0e0e] border border-amber-600/40 text-amber-300/70 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                title="Log out (resumes here upon next login)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-full bg-[#f59e0b] hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              Log In / Register
            </button>
          )}
        </div>
      </header>

      {/* Hero Chariot Painting & Karmanye Vadhikaraste Verse (Fitted within screen) */}
      <section className="relative overflow-hidden w-full bg-[#180505]">
        {/* Krishna & Arjuna on Chariot Painting - Fitted responsively without overflow */}
        <div className="relative w-full max-w-5xl mx-auto px-4 pt-3 flex items-center justify-center">
          <div className="w-full rounded-2xl overflow-hidden border border-amber-500/25 shadow-2xl shadow-black/80">
            <img
              src={chariotBanner}
              alt="Lord Krishna and Arjuna on the Chariot at Kurukshetra"
              className="w-full h-auto max-h-[42vh] object-contain object-center mx-auto filter brightness-[0.96] contrast-[1.04]"
            />
          </div>
        </div>

        {/* Karmanye Vadhikaraste Verse Below Painting */}
        <div className="relative z-10 text-center py-4 px-4 bg-[#140505]">
          <h2 className="font-serif text-lg sm:text-2xl text-amber-300 font-bold tracking-wide">
            कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
          </h2>
          <p className="text-amber-200/80 font-serif italic text-xs sm:text-sm mt-1">
            “You have a right to your actions, never to their fruits.”
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-8 bg-[#140505]">
        {!user ? (
          <div className="max-w-md mx-auto text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-[#f59e0b] text-[#1a0808] mx-auto flex items-center justify-center text-3xl font-serif mb-4 shadow-lg shadow-amber-500/30">
              ॐ
            </div>
            <h2 className="text-2xl font-bold font-serif text-amber-200">Experience the Bhagavad Gita</h2>
            <p className="text-amber-200/70 text-sm mt-2 mb-6">
              Read and listen to the sacred teachings comfortably in 5, 10, or 20 minutes each day. Never lose your place.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/30 transition-all"
            >
              Create Seeker Profile to Begin
            </button>
          </div>
        ) : activeSession ? (
          <ReadingSession
            shlokas={activeSession.shlokas}
            initialIndex={activeSession.initialIndex}
            totalSessionMinutes={activeSession.durationMinutes}
            user={user}
            initialMode={activeSession.sessionMode}
            onFinishSession={handleFinishSession}
            onExitEarly={handleExitEarly}
          />
        ) : (
          <TimeSelector
            user={user}
            onStartSession={handleStartSession}
            onOpenSettings={() => setIsProfileOpen(true)}
            onResetToBeginning={() => handleSelectShloka(0)}
          />
        )}
      </main>

      {/* Footer with "Hari Om Tat Sat" (As requested) */}
      <footer className="py-6 px-4 border-t border-amber-900/40 bg-[#0d0303] text-center text-xs text-amber-300/60 space-y-1">
        <p className="font-serif tracking-widest text-amber-400 text-sm">
          ॥ हरिः ॐ तत् सत् ॥
        </p>
        <p className="text-[11px] text-amber-300/40">
          Daily Gita Companion • Sacred Shlokas at your pace
        </p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onLogin={handleLogin}
        existingProfile={user}
      />

      {user && (
        <>
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
          />

          <ChapterBrowserModal
            isOpen={isBrowserOpen}
            onClose={() => setIsBrowserOpen(false)}
            onSelectShloka={handleSelectShloka}
            completedIds={user.completedShlokaIds}
            bookmarkedIds={user.bookmarkedIds}
          />
        </>
      )}
    </div>
  );
}

export default App;
