import { UserProfile } from '../types';
import { GITA_SHLOKAS } from '../data/shlokas';

const STORAGE_KEY = 'daily_gita_user_profile';
const COOKIE_KEY = 'daily_gita_profile_id';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'devoted_seeker',
  name: 'Seeker',
  preferredLanguage: 'english',
  voiceEngine: 'native',
  voiceGender: 'male',
  elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
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

// Helper to set cross-session cookie for iOS Safari / Mobile Chrome
function setCookie(name: string, val: string, days: number = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(val)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (e) {
    return null;
  }
}

// Multi-tier storage retrieval: localStorage -> cookie fallback -> auto-initialize
export const getStoredProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('localStorage reading error on mobile:', err);
  }

  // Check cookie backup
  try {
    const cookieData = getCookie(STORAGE_KEY);
    if (cookieData) {
      const parsed = JSON.parse(cookieData);
      if (parsed && typeof parsed === 'object') {
        saveStoredProfile(parsed);
        return parsed;
      }
    }
  } catch (err) {}

  // Auto-initialize profile immediately so mobile users never face a recurring popup wall
  const autoCreated: UserProfile = {
    ...DEFAULT_PROFILE,
    id: `seeker_${Date.now()}`
  };
  saveStoredProfile(autoCreated);
  return autoCreated;
};

export const saveStoredProfile = (profile: UserProfile): void => {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Write to cookie as mobile storage backup (prevents iOS WebKit 7-day storage purge)
    setCookie(STORAGE_KEY, serialized, 365);
  } catch (err) {
    console.error('Failed saving user profile to storage', err);
  }
};

export const removeStoredProfile = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    setCookie(STORAGE_KEY, '', -1);
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
  let minsPerShloka = 2;
  if (readingSpeed === 'slow') minsPerShloka = 3;
  if (readingSpeed === 'fast') minsPerShloka = 1;

  let count = Math.max(1, Math.round(timeMinutes / minsPerShloka));
  
  const total = GITA_SHLOKAS.length;
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
