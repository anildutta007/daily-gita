export interface Shloka {
  id: number;
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration: string;
  wordMeanings?: string;
  englishMeaning: string;
  hindiMeaning: string;
  commentaryEnglish?: string;
  commentaryHindi?: string;
  theme?: string;
}

export interface ChapterMeta {
  chapter: number;
  nameSanskrit: string;
  nameTransliteration: string;
  nameEnglish: string;
  nameHindi: string;
  versesCount: number;
  summary: string;
}

export interface UserProfile {
  id: string;
  name: string;
  preferredLanguage: 'english' | 'hindi';
  readingSpeed: 'slow' | 'medium' | 'fast'; // slow: 3 min/shloka, medium: 2 min/shloka, fast: 1 min/shloka
  ambientSound: 'flute' | 'tanpura' | 'om' | 'none';
  voiceSpeed: number; // 0.8 to 1.2
  // Progress tracker
  currentShlokaIndex: number; // pointer to gitaShlokas array (0-based)
  completedShlokaIds: number[];
  bookmarkedIds: number[];
  totalMinutesSpent: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: {
    date: string;
    durationMinutes: number;
    shlokasCovered: number;
  }[];
}

export interface SessionPlan {
  durationMinutes: number;
  shlokas: Shloka[];
  startIndex: number;
  endIndex: number;
  estimatedTimePerShlokaMinutes: number;
}
