import { UserProfile } from '../types';
import { GITA_SHLOKAS } from '../data/shlokas';

const STORAGE_KEY = 'daily_gita_user_profile';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'guest_seeker',
  name: 'Arjuna Seeker',
  preferredLanguage: 'english',
  readingSpeed: 'medium', // 2 min per shloka
  ambientSound: 'flute',
  voiceSpeed: 0.95,
  currentShlokaIndex: 0,
  completedShlokaIds: [],
  bookmarkedIds: [],
  totalMinutesSpent: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  history: []
};

export const getStoredProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading user profile from localStorage', err);
    return null;
  }
};

export const saveStoredProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed saving user profile to localStorage', err);
  }
};

export const removeStoredProfile = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed removing profile', err);
  }
};

// Calculate how many shlokas fit into time limit
export const calculateShlokasForTime = (
  timeMinutes: number,
  readingSpeed: 'slow' | 'medium' | 'fast',
  currentIndex: number
) => {
  // slow: ~3 mins per shloka (detailed commentary + chant)
  // medium: ~2 mins per shloka
  // fast: ~1 min per shloka
  let minsPerShloka = 2;
  if (readingSpeed === 'slow') minsPerShloka = 3;
  if (readingSpeed === 'fast') minsPerShloka = 1;

  let count = Math.max(1, Math.round(timeMinutes / minsPerShloka));
  
  // Bound to available shlokas
  const total = GITA_SHLOKAS.length;
  // If currentIndex reached end, loop or clamp
  const safeCurrentIndex = currentIndex >= total ? 0 : currentIndex;
  const endIndex = Math.min(total, safeCurrentIndex + count);
  const selected = GITA_SHLOKAS.slice(safeCurrentIndex, endIndex);

  return {
    shlokas: selected,
    startIndex: safeCurrentIndex,
    endIndex: endIndex,
    count: selected.length,
    estimatedMinutes: selected.length * minsPerShloka,
    minsPerShloka
  };
};
