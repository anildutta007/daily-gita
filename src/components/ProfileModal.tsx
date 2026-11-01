import React, { useState } from 'react';
import { UserProfile } from '../types';
import { GITA_SHLOKAS } from '../data/shlokas';
import { CHAPTER_METADATA } from '../data/chapterMeta';
import {
  Sparkles,
  BookOpen,
  Volume2,
  Clock,
  RotateCcw,
  CheckCircle,
  Bookmark,
  Calendar,
  Flame,
  User,
  Sliders,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout
}) => {
  const [name, setName] = useState(user.name);
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(user.voiceGender || 'male');
  const [readingSpeed, setReadingSpeed] = useState(user.readingSpeed);
  const [ambientSound, setAmbientSound] = useState(user.ambientSound);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name,
      preferredLanguage,
      voiceGender,
      readingSpeed,
      ambientSound
    });
    onClose();
  };

  const handleResetProgress = () => {
    if (window.confirm("Do you want to reset your reading position to Chapter 1, Verse 1? Your streak and history will remain safe.")) {
      onUpdateUser({
        ...user,
        currentShlokaIndex: 0
      });
      onClose();
    }
  };

  const completedCount = user.completedShlokaIds.length;
  const currentShloka = GITA_SHLOKAS[user.currentShlokaIndex] || GITA_SHLOKAS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200">{user.name}</h2>
              <p className="text-xs text-slate-400">Personal Sadhana & Profile Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-2 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex justify-center text-amber-400 mb-1">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div className="text-lg font-bold text-slate-100">{user.streakDays} Days</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Streak</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex justify-center text-amber-400 mb-1">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-lg font-bold text-slate-100">{user.totalMinutesSpent} m</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time Spent</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex justify-center text-emerald-400 mb-1">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-lg font-bold text-slate-100">{completedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Completed</div>
          </div>
        </div>

        {/* Current Position Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                Current Bookmark Position
              </div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                Chapter {currentShloka.chapter}, Verse {currentShloka.verse}
              </div>
              <div className="text-xs text-slate-400">
                Next login will automatically resume from here.
              </div>
            </div>
            <button
              onClick={handleResetProgress}
              className="text-xs text-amber-400 hover:text-amber-300 underline p-1"
            >
              Start Over
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Preferred Audio / Bhavarth Language
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredLanguage('english')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                  preferredLanguage === 'english'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                English Translation
              </button>
              <button
                type="button"
                onClick={() => setPreferredLanguage('hindi')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                  preferredLanguage === 'hindi'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                हिंदी भावार्थ (Hindi)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Recitation Voice Gender
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVoiceGender('male')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                  voiceGender === 'male'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                🧔 Male Voice
              </button>
              <button
                type="button"
                onClick={() => setVoiceGender('female')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                  voiceGender === 'female'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                👩 Female Voice
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Pacing Speed (Used to calculate shlokas per session)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'slow', label: 'Slow (3m/shloka)' },
                { id: 'medium', label: 'Medium (2m/shloka)' },
                { id: 'fast', label: 'Fast (1m/shloka)' },
              ].map(speed => (
                <button
                  key={speed.id}
                  type="button"
                  onClick={() => setReadingSpeed(speed.id as any)}
                  className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold ${
                    readingSpeed === speed.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400'
                  }`}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              Save Preferences
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
