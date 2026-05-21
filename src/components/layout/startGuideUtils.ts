export type GuideItemId =
  | 'companyProfile'
  | 'uploadLogo'
  | 'customizeInvoices'
  | 'firstClient'
  | 'firstProject';

type ManualState = Partial<Record<GuideItemId, boolean>>;

const GUIDE_REFRESH_EVENT = 'start-guide-refresh';

function storageKey(prefix: string, userId: string) {
  return `start-guide:${prefix}:${userId}`;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
}

export function notifyStartGuideRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GUIDE_REFRESH_EVENT));
}

/** Marks a getting-started item complete (e.g. after saving invoice settings). */
export function markStartGuideItemComplete(userId: string, id: GuideItemId) {
  const key = storageKey('manual', userId);
  const next = { ...loadJson<ManualState>(key, {}), [id]: true };
  saveJson(key, next);
  notifyStartGuideRefresh();
}

export { GUIDE_REFRESH_EVENT, storageKey, loadJson, saveJson };
