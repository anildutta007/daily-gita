// Visitor counter utility for Gita Companion
// Dual strategy: Synchronizes with remote CountAPI while keeping a fallback in localStorage & cookies.
// Guaranteed to start at least with 10.

const COUNTER_KEY = 'daily_gita_anildutta_visitors';
const LOCAL_VISITOR_KEY = 'daily_gita_visitor_count';
const SESSION_VISITED_KEY = 'daily_gita_has_counted_session';
const MIN_VISITOR_COUNT = 10;

export async function recordAndGetVisitorCount(): Promise<number> {
  // Check local fallback first
  let cachedCount = MIN_VISITOR_COUNT;
  try {
    const stored = localStorage.getItem(LOCAL_VISITOR_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= MIN_VISITOR_COUNT) {
        cachedCount = parsed;
      }
    }
  } catch (e) {}

  // Determine whether this browser session has already incremented
  const alreadyCountedInSession = Boolean(sessionStorage.getItem(SESSION_VISITED_KEY));

  try {
    // If not counted in this session, increment (hit) on remote API; otherwise just get current count
    const endpoint = alreadyCountedInSession
      ? `https://countapi.mileshilliard.com/api/v1/get/${COUNTER_KEY}`
      : `https://countapi.mileshilliard.com/api/v1/hit/${COUNTER_KEY}`;

    const res = await fetch(endpoint, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.value === 'number') {
        const finalCount = Math.max(data.value, MIN_VISITOR_COUNT);
        try {
          sessionStorage.setItem(SESSION_VISITED_KEY, 'true');
          localStorage.setItem(LOCAL_VISITOR_KEY, String(finalCount));
        } catch (e) {}
        return finalCount;
      }
    }
  } catch (err) {
    console.warn('Remote visitor counter offline, using local persistent count:', err);
  }

  // Fallback if offline
  if (!alreadyCountedInSession) {
    cachedCount += 1;
    try {
      sessionStorage.setItem(SESSION_VISITED_KEY, 'true');
      localStorage.setItem(LOCAL_VISITOR_KEY, String(cachedCount));
    } catch (e) {}
  }

  return cachedCount;
}
