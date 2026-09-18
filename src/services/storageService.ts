import { TranslationItem, UserSettings, PermissionStatus } from '../types/translation';

const SETTINGS_KEY = 'fhm_user_settings_v1';
const HISTORY_KEY = 'fhm_translation_history_v1';
const PERMISSIONS_KEY = 'fhm_permissions_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  preferredTargetLanguage: 'bn', // Dynamic initial choice customizable per user
  defaultSourceLanguage: 'auto',
  autoDetect: true,
  speechSpeed: 1.0,
  autoSpeak: false,
  theme: 'dark',
  floatingTranslatorEnabled: false,
  floatingBubblePosition: { x: 20, y: 180 },
  floatingBubbleSize: 'medium',
  floatingAutoTranslateOnCopy: true,
  floatingDockToEdge: true,
  floatingEdgeSide: 'left',
  floatingAutoCollapse: true,
  recentLanguages: ['bn', 'en', 'it', 'ar', 'es'],
  favoriteLanguages: ['bn', 'en', 'it', 'ar', 'hi', 'fr', 'de'],
  hasCompletedOnboarding: false,
};

export const DEFAULT_PERMISSIONS: PermissionStatus = {
  overlay: false,
  camera: false,
  microphone: false,
  notification: false,
  screenCapture: false,
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadHistory(): TranslationItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveHistoryItem(item: Omit<TranslationItem, 'id' | 'timestamp'>): TranslationItem {
  const current = loadHistory();
  const newItem: TranslationItem = {
    ...item,
    id: `fhm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  // Avoid consecutive exact duplicates
  const filtered = current.filter(
    (h) => !(h.originalText === newItem.originalText && h.targetLang === newItem.targetLang)
  );

  const updated = [newItem, ...filtered].slice(0, 250);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history item:', e);
  }
  return newItem;
}

export function toggleFavoriteHistoryItem(id: string): TranslationItem[] {
  const current = loadHistory();
  const updated = current.map((item) =>
    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update favorite:', e);
  }
  return updated;
}

export function deleteHistoryItem(id: string): TranslationItem[] {
  const current = loadHistory();
  const updated = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
  return updated;
}

export function clearAllHistory(): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

export function loadPermissions(): PermissionStatus {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (!raw) return DEFAULT_PERMISSIONS;
    return { ...DEFAULT_PERMISSIONS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PERMISSIONS;
  }
}

export function savePermission(permKey: keyof PermissionStatus, granted: boolean): PermissionStatus {
  const current = loadPermissions();
  const updated = { ...current, [permKey]: granted };
  try {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save permission:', e);
  }
  return updated;
}
