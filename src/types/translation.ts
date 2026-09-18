export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL?: boolean;
  supportsTTS?: boolean;
  supportsVoice?: boolean;
  group?: string;
}

export type TranslationMode = 'text' | 'voice' | 'camera' | 'image' | 'screen';

export interface TranslationItem {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang?: string;
  detectedLangName?: string;
  timestamp: number;
  isFavorite?: boolean;
  mode: TranslationMode;
  notes?: string;
}

export interface OCRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  translation: string;
}

export interface OCRResult {
  fullOriginalText: string;
  fullTranslatedText: string;
  detectedLanguage?: string;
  confidence?: number;
  blocks: OCRBoundingBox[];
}

export interface UserSettings {
  preferredTargetLanguage: string;
  defaultSourceLanguage: string;
  autoDetect: boolean;
  speechSpeed: number; // 0.5 to 1.5
  autoSpeak: boolean;
  theme: 'dark' | 'light' | 'system';
  floatingTranslatorEnabled: boolean;
  floatingBubblePosition: { x: number; y: number };
  floatingBubbleSize: 'small' | 'medium' | 'large';
  floatingAutoTranslateOnCopy: boolean;
  floatingDockToEdge: boolean;
  floatingEdgeSide?: 'left' | 'right';
  floatingAutoCollapse?: boolean;
  recentLanguages: string[];
  favoriteLanguages: string[];
  hasCompletedOnboarding: boolean;
}

export interface PermissionStatus {
  overlay: boolean;
  camera: boolean;
  microphone: boolean;
  notification: boolean;
  screenCapture: boolean;
}

export type PermissionType = keyof PermissionStatus;

export interface ConversationMessage {
  id: string;
  speaker: 'A' | 'B';
  lang: string;
  langName: string;
  text: string;
  translatedText: string;
  timestamp: number;
}
