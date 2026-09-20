/**
 * FHM Translate - Android Native Bridge & Web Fallback Adapter
 * Developer: Fakhrul Islam
 */

declare global {
  interface Window {
    AndroidBridge?: {
      isNativeAndroid: () => boolean;
      checkOverlayPermission: () => boolean;
      requestOverlayPermission: () => void;
      startFloatingBubbleService: (x: number, y: number, size: string) => void;
      stopFloatingBubbleService: () => void;
      updateFloatingPosition: (x: number, y: number) => void;
      startScreenCapture: () => void;
      startVoiceRecognition: (lang: string) => void;
      requestCameraPermission: () => void;
      requestAudioPermission: () => void;
      speakText: (text: string, lang: string, speed: number) => void;
      vibrate: (durationMs: number) => void;
      showToast: (message: string) => void;
    };
    onAndroidVoiceResult?: (text: string) => void;
    onOverlayPermissionGranted?: () => void;
    onOverlayPermissionDenied?: () => void;
    onScreenCaptureStarted?: () => void;
    onScreenCaptureDenied?: () => void;
  }
}

class AndroidBridgeService {
  private voiceListeners: Array<(text: string) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.onAndroidVoiceResult = (text: string) => {
        this.voiceListeners.forEach((listener) => listener(text));
      };
    }
  }

  public isNative(): boolean {
    return Boolean(window.AndroidBridge && window.AndroidBridge.isNativeAndroid?.());
  }

  public checkOverlayPermission(): boolean {
    if (this.isNative() && window.AndroidBridge?.checkOverlayPermission) {
      return window.AndroidBridge.checkOverlayPermission();
    }
    // Web fallback: check stored permission status
    return localStorage.getItem('fhm_permission_overlay') === 'granted';
  }

  public async requestOverlayPermission(): Promise<boolean> {
    if (this.isNative() && window.AndroidBridge?.requestOverlayPermission) {
      window.AndroidBridge.requestOverlayPermission();
      return true;
    }
    // Web simulation:
    localStorage.setItem('fhm_permission_overlay', 'granted');
    return true;
  }

  public async requestScreenCapture(): Promise<boolean> {
    if (this.isNative() && window.AndroidBridge?.startScreenCapture) {
      window.AndroidBridge.startScreenCapture();
      return true;
    }
    localStorage.setItem('fhm_permission_screenCapture', 'granted');
    return true;
  }

  public startFloatingService(x = 20, y = 150, size = 'medium') {
    if (this.isNative() && window.AndroidBridge?.startFloatingBubbleService) {
      window.AndroidBridge.startFloatingBubbleService(x, y, size);
    }
    // Update local state
    localStorage.setItem('fhm_floating_active', 'true');
  }

  public stopFloatingService() {
    if (this.isNative() && window.AndroidBridge?.stopFloatingBubbleService) {
      window.AndroidBridge.stopFloatingBubbleService();
    }
    localStorage.setItem('fhm_floating_active', 'false');
  }

  public updateFloatingPosition(x: number, y: number) {
    if (this.isNative() && window.AndroidBridge?.updateFloatingPosition) {
      window.AndroidBridge.updateFloatingPosition(x, y);
    }
  }

  public startVoiceRecognition(lang: string = 'en') {
    if (this.isNative() && window.AndroidBridge?.startVoiceRecognition) {
      window.AndroidBridge.startVoiceRecognition(lang);
    }
  }

  public addVoiceListener(callback: (text: string) => void) {
    this.voiceListeners.push(callback);
    return () => {
      this.voiceListeners = this.voiceListeners.filter((l) => l !== callback);
    };
  }

  public vibrate(ms = 35) {
    if (this.isNative() && window.AndroidBridge?.vibrate) {
      window.AndroidBridge.vibrate(ms);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // ignore in case browser blocks
      }
    }
  }

  public showToast(message: string) {
    if (this.isNative() && window.AndroidBridge?.showToast) {
      window.AndroidBridge.showToast(message);
    }
  }

  public speak(text: string, langCode: string, speed = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (this.isNative() && window.AndroidBridge?.speakText) {
        window.AndroidBridge.speakText(text, langCode, speed);
        resolve();
        return;
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speed;

        const langMap: Record<string, string> = {
          bn: 'bn-BD',
          it: 'it-IT',
          en: 'en-US',
          ar: 'ar-SA',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          hi: 'hi-IN',
          ur: 'ur-PK',
          zh: 'zh-CN',
          ja: 'ja-JP',
          ko: 'ko-KR',
          ru: 'ru-RU',
          tr: 'tr-TR',
          pt: 'pt-BR',
        };

        utterance.lang = langMap[langCode] || langCode;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const androidBridge = new AndroidBridgeService();
