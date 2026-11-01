import React, { useState } from 'react';
import { UserProfile, Shloka } from '../types';
import { GITA_SHLOKAS } from '../data/shlokas';
import { calculateShlokasForTime } from '../utils/storage';
import { Clock, BookOpen, Sparkles, Bookmark, ArrowRight, Play } from 'lucide-react';

interface TimeSelectorProps {
  user: UserProfile;
  onStartSession: (durationMinutes: number) => void;
  onOpenSettings: () => void;
  onResetToBeginning?: () => void;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  user,
  onStartSession,
  onResetToBeginning
}) => {
  const [customTime, setCustomTime] = useState<number>(10);
  const [selectedTime, setSelectedTime] = useState<number>(10);

  const presets = [
    { minutes: 5, label: '5 Mins', badge: 'Quick Reflection', verses: '2-3 verses' },
    { minutes: 10, label: '10 Mins', badge: 'Most Popular', verses: '4-5 verses' },
    { minutes: 15, label: '15 Mins', badge: 'Morning Sadhana', verses: '7-8 verses' },
    { minutes: 20, label: '20 Mins', badge: 'Deep Immersion', verses: '10 verses' },
    { minutes: 30, label: '30 Mins', badge: 'Complete Contemplation', verses: '15 verses' }
  ];

  const currentShloka: Shloka = GITA_SHLOKAS[user.currentShlokaIndex] || GITA_SHLOKAS[0];
  const progressPercent = Math.min(100, Math.round(((user.currentShlokaIndex + 1) / GITA_SHLOKAS.length) * 100));

  const calculation = calculateShlokasForTime(selectedTime, user.readingSpeed, user.currentShlokaIndex);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Top Welcome / Resume Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2c0d0d] via-[#1f0909] to-[#2c0d0d] border border-amber-500/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Namaste, {user.name}</span>
              <span className="text-amber-500/60">•</span>
              <span>🔥 {user.streakDays} Day Streak</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-100 font-serif tracking-tight">
              Where will your soul journey today?
            </h1>
            <p className="text-amber-200/80 text-sm mt-1.5 max-w-xl">
              You last paused at <span className="text-amber-400 font-medium">Chapter {currentShloka.chapter}, Verse {currentShloka.verse}</span>.
              Tell us your available time, and the app will tailor the exact verses and audio chanting you can absorb in that window.
            </p>

            {/* Quick Start Again / Reset Option */}
            {user.currentShlokaIndex > 0 && onResetToBeginning && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Start reading again from Chapter 1, Verse 1?")) {
                      onResetToBeginning();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#170505] border border-amber-500/40 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-amber-100 transition-all shadow-sm"
                >
                  <span>🔄 Start again from Chapter 1, Verse 1</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 bg-[#140505] border border-amber-500/30 rounded-2xl p-4 self-start md:self-auto min-w-[200px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-amber-300/80 mb-1">
                <span>Gita Journey</span>
                <span className="text-amber-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#2a0e0e] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-amber-300/60 mt-1.5">
                Verse {user.currentShlokaIndex + 1} of {GITA_SHLOKAS.length} explored
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Question Card: "How much time do you have got?" */}
      <div className="bg-[#200808]/90 border border-amber-500/35 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/15 text-amber-400 mb-3 border border-amber-500/30">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-100 font-serif">
            How much time have you got today?
          </h2>
          <p className="text-sm text-amber-200/70 mt-2">
            Select or enter your minutes. Only the shlokas and translations that comfortably fit your session will be loaded.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {presets.map((preset) => {
            const isSelected = selectedTime === preset.minutes;
            return (
              <button
                key={preset.minutes}
                onClick={() => {
                  setSelectedTime(preset.minutes);
                  setCustomTime(preset.minutes);
                }}
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center group ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 text-amber-200 scale-[1.02]'
                    : 'bg-[#180505] border-amber-900/60 text-amber-200/70 hover:border-amber-700 hover:bg-[#250a0a]'
                }`}
              >
                {preset.badge && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-2 ${
                    isSelected ? 'bg-amber-400 text-slate-950' : 'bg-[#290a0a] text-amber-300/70'
                  }`}>
                    {preset.badge}
                  </span>
                )}
                <span className="text-xl sm:text-2xl font-black font-sans tracking-tight">
                  {preset.minutes} <span className="text-sm font-medium">min</span>
                </span>
                <span className="text-[11px] text-amber-300/60 mt-1">
                  {preset.verses}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Range Slider */}
        <div className="bg-[#140505] rounded-2xl p-4 sm:p-5 border border-amber-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="w-full sm:w-auto">
            <span className="text-xs uppercase tracking-wider text-amber-300/70 font-semibold block">
              Or fine-tune custom duration:
            </span>
            <span className="text-lg font-bold text-amber-300">
              {customTime} Minutes
            </span>
          </div>
          <div className="w-full sm:flex-1 max-w-md">
            <input
              type="range"
              min={3}
              max={60}
              step={1}
              value={customTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomTime(val);
                setSelectedTime(val);
              }}
              className="w-full accent-amber-500 h-2 bg-[#2d0e0e] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-amber-300/50 mt-1">
              <span>3 mins</span>
              <span>15 mins</span>
              <span>30 mins</span>
              <span>60 mins</span>
            </div>
          </div>
        </div>

        {/* Dynamic Session Preview */}
        <div className="bg-gradient-to-r from-amber-500/15 via-[#2a0e0e] to-amber-500/10 rounded-2xl p-5 border border-amber-500/30 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Session Plan Tailored For You
              </div>
              <div className="text-sm sm:text-base font-medium text-amber-100">
                Curated: <span className="text-amber-300 font-bold">{calculation.count} Shlokas</span> starting from Chapter {calculation.shlokas[0]?.chapter}, Verse {calculation.shlokas[0]?.verse}
              </div>
              <p className="text-xs text-amber-200/70">
                Covers Sanskrit chant, transliteration, English & Hindi meanings, plus contemplative commentary in ~{calculation.estimatedMinutes} minutes.
              </p>
            </div>

            <button
              onClick={() => onStartSession(selectedTime)}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Begin {selectedTime} Min Session</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shloka sneak-peek preview */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-amber-300/70 font-semibold">
            Verses in this upcoming session ({calculation.count} Total):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
            {calculation.shlokas.map((s, idx) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-[#150505] border border-amber-900/60 hover:border-amber-500/40 transition-all flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-mono text-amber-300 shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-amber-300">
                    Chapter {s.chapter}, Verse {s.verse} • {s.theme}
                  </div>
                  <div className="text-xs text-amber-200/60 truncate font-serif mt-0.5">
                    {s.sanskrit.split('\n')[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Jump & Study Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#200808]/60 border border-amber-500/20 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-amber-300/70 font-medium">Completed Verses</div>
            <div className="text-base font-bold text-amber-100">
              {user.completedShlokaIds.length} verses mastered
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#200808]/60 border border-amber-500/20 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-amber-300/70 font-medium">Sacred Time Spent</div>
            <div className="text-base font-bold text-amber-100">
              {user.totalMinutesSpent} minutes immersed
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#200808]/60 border border-amber-500/20 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-amber-300/70 font-medium">Saved Verses</div>
            <div className="text-base font-bold text-amber-100">
              {user.bookmarkedIds.length} bookmarked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
