import React, { useState, useEffect } from 'react';
import { UserProfile, Shloka } from './types';
import { GITA_SHLOKAS } from './data/shlokas';
import {
  getStoredProfile,
  saveStoredProfile,
  removeStoredProfile,
  DEFAULT_PROFILE,
  calculateShlokasForTime
} from './utils/storage';
import { AuthModal } from './components/AuthModal';
import { TimeSelector } from './components/TimeSelector';
import { ReadingSession } from './components/ReadingSession';
import { ProfileModal } from './components/ProfileModal';
import { ChapterBrowserModal } from './components/ChapterBrowserModal';
import {
  Compass,
  User,
  LogOut,
  Sparkles,
  BookOpen,
  Volume2,
  Clock,
  Flame,
  Sun,
  ShieldCheck
} from 'lucide-react';

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
  } | null>(null);

  // Initialize profile on mount
  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) {
      // Check streak calculation
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
      // Show login/registration modal on first open
      setIsAuthOpen(true);
    }
  }, []);

  // Update and persist user
  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    saveStoredProfile(updated);
  };

  // User logs out: clears stored session and returns to login modal
  const handleLogout = () => {
    removeStoredProfile();
    setUser(null);
    setActiveSession(null);
    setIsProfileOpen(false);
    setIsAuthOpen(true);
  };

  // Login handler
  const handleLogin = (newProfile: UserProfile) => {
    setUser(newProfile);
    saveStoredProfile(newProfile);
    setIsAuthOpen(false);
  };

  // Start reading session with requested minutes
  const handleStartSession = (durationMinutes: number) => {
    if (!user) return;
    const { shlokas, startIndex } = calculateShlokasForTime(
      durationMinutes,
      user.readingSpeed,
      user.currentShlokaIndex
    );

    setActiveSession({
      durationMinutes,
      shlokas,
      initialIndex: startIndex
    });
  };

  // Complete session & persist progress
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

  // Early pause & save
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

  // Handle jump to verse from browser
  const handleSelectShloka = (shlokaIndex: number) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      currentShlokaIndex: shlokaIndex
    };
    handleUpdateUser(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300 font-serif text-xl font-bold">
              🕉️
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-extrabold text-base sm:text-lg text-amber-200 tracking-wide">
                Daily Gita
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
                Timeless Wisdom
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Sacred shlokas tailored to your daily schedule & time
            </p>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Chapter explorer trigger */}
              <button
                onClick={() => setIsBrowserOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all"
                title="Browse all 18 chapters"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">18 Chapters</span>
              </button>

              {/* Profile / Preferences pill */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[90px] truncate">{user.name}</span>
              </button>

              {/* Direct Logout shortcut button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                title="Log out (resumes here upon next login)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
            >
              Log In / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-8">
        {!user ? (
          <div className="max-w-md mx-auto text-center py-20 px-4">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-4xl mb-4">
              🕉️
            </div>
            <h2 className="text-2xl font-bold text-amber-200">Experience the Bhagavad Gita</h2>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              Read and listen to the sacred teachings comfortably in 5, 10, or 20 minutes each day. Never lose your place.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all"
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
            onFinishSession={handleFinishSession}
            onExitEarly={handleExitEarly}
          />
        ) : (
          <TimeSelector
            user={user}
            onStartSession={handleStartSession}
            onOpenSettings={() => setIsProfileOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-900 bg-slate-950/60 text-center text-xs text-slate-500 space-y-1">
        <p>
          "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय" — Perform duty with equanimity.
        </p>
        <p className="text-[11px] text-slate-600">
          Daily Gita Companion • Sanskrit Chanting, English & Hindi Bhavarth, Multilingual Audio
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
