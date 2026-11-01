import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, BookOpen, Volume2, Globe, Flame, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onLogin: (profile: UserProfile) => void;
  existingProfile?: UserProfile | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onLogin,
  existingProfile
}) => {
  const [name, setName] = useState(existingProfile?.name || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'english' | 'hindi'>(
    existingProfile?.preferredLanguage || 'english'
  );
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(
    existingProfile?.voiceGender || 'male'
  );
  const [readingSpeed, setReadingSpeed] = useState<'slow' | 'medium' | 'fast'>(
    existingProfile?.readingSpeed || 'medium'
  );
  const [ambientSound, setAmbientSound] = useState<'flute' | 'tanpura' | 'om' | 'none'>(
    existingProfile?.ambientSound || 'flute'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: UserProfile = {
      id: existingProfile?.id || `seeker_${Date.now()}`,
      name: name.trim() || 'Devoted Seeker',
      preferredLanguage,
      voiceGender,
      readingSpeed,
      ambientSound,
      voiceSpeed: existingProfile?.voiceSpeed ?? 0.95,
      currentShlokaIndex: existingProfile?.currentShlokaIndex ?? 0,
      completedShlokaIds: existingProfile?.completedShlokaIds ?? [],
      bookmarkedIds: existingProfile?.bookmarkedIds ?? [],
      totalMinutesSpent: existingProfile?.totalMinutesSpent ?? 0,
      streakDays: existingProfile?.streakDays ?? 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      history: existingProfile?.history ?? []
    };
    onLogin(finalProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/40 text-slate-100">
        
        {/* Decorative Golden Aura Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            <span className="text-3xl font-serif">🕉️</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-amber-200">
            {existingProfile ? 'Welcome Back Seeker' : 'Begin Your Spiritual Journey'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immerse yourself in eternal wisdom tailored to your daily time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-1.5">
              Your Name / Seeker Identity
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arjuna, Meera, Priya"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 text-slate-100 text-sm placeholder-slate-500 transition-all"
            />
          </div>

          {/* Preferred Language for audio & meaning */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                Default Audio & Meaning Language
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredLanguage('english')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  preferredLanguage === 'english'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                }`}
              >
                English Translation
              </button>
              <button
                type="button"
                onClick={() => setPreferredLanguage('hindi')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all font-hindi ${
                  preferredLanguage === 'hindi'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                }`}
              >
                हिंदी भावार्थ (Hindi)
              </button>
            </div>
          </div>

          {/* Voice Gender Choice */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Recitation Voice Gender
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVoiceGender('male')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  voiceGender === 'male'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                }`}
              >
                🧔 Male Voice
              </button>
              <button
                type="button"
                onClick={() => setVoiceGender('female')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  voiceGender === 'female'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                }`}
              >
                👩 Female Voice
              </button>
            </div>
          </div>

          {/* Reading Pace / Depth */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                Pacing & Contemplation Depth
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'slow', label: 'Deep', desc: '3 min/verse' },
                { id: 'medium', label: 'Balanced', desc: '2 min/verse' },
                { id: 'fast', label: 'Swift', desc: '1 min/verse' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReadingSpeed(opt.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    readingSpeed === opt.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ambient sound */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Sacred Background Ambience
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'flute', label: '🪈 Flute' },
                { id: 'tanpura', label: '🪕 Tanpura' },
                { id: 'om', label: '🕉️ Om Drone' },
                { id: 'none', label: '🔇 Silent' },
              ].map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => setAmbientSound(sound.id as any)}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                    ambientSound === sound.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {sound.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              {existingProfile ? 'Save & Continue' : 'Create Profile & Enter'}
            </button>
          </div>
        </form>

        {existingProfile && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Continuing from Chapter {existingProfile.currentShlokaIndex + 1 > 0 ? 'where you left off' : '1'} • 
              Streak: <span className="text-amber-400 font-semibold">{existingProfile.streakDays} days 🔥</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
