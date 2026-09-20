import React, { useState, useEffect } from 'react';
import {
  Languages,
  Mic,
  Camera,
  Image as ImageIcon,
  Scan,
  Sparkles,
} from 'lucide-react';
import {
  UserSettings,
  PermissionStatus,
  TranslationItem,
  Language,
  PermissionType,
} from './types/translation';
import {
  loadUserSettings,
  saveUserSettings,
  loadHistory,
  toggleFavoriteHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
  loadPermissions,
  savePermission,
  DEFAULT_USER_SETTINGS,
} from './services/storageService';
import {
  UNIVERSAL_LANGUAGES,
  AUTO_DETECT_LANGUAGE,
  getLanguageByCode,
} from './data/languages';
import { androidBridge } from './services/androidBridge';

// Components
import { Header } from './components/Header';
import { MainTranslator } from './components/MainTranslator';
import { VoiceTranslator } from './components/VoiceTranslator';
import { CameraTranslator } from './components/CameraTranslator';
import { ImageTranslator } from './components/ImageTranslator';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { FloatingBubble } from './components/FloatingBubble';
import { FloatingControlsModal } from './components/FloatingControlsModal';
import { ScreenTranslatorOverlay } from './components/ScreenTranslatorOverlay';
import { ScreenSimModal } from './components/ScreenSimModal';
import { HistoryFavoritesModal } from './components/HistoryFavoritesModal';
import { SettingsModal } from './components/SettingsModal';
import { PermissionModal } from './components/PermissionModal';
import { FirstLaunchOnboarding } from './components/FirstLaunchOnboarding';
import { AdBanner } from './components/AdBanner';

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [permissions, setPermissions] = useState<PermissionStatus>(loadPermissions());
  const [history, setHistory] = useState<TranslationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'camera' | 'image'>('text');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Active Languages
  const [sourceLang, setSourceLang] = useState<Language>(AUTO_DETECT_LANGUAGE);
  const [targetLang, setTargetLang] = useState<Language>(
    getLanguageByCode(DEFAULT_USER_SETTINGS.preferredTargetLanguage)
  );

  // Modals state
  const [isSourceLangModalOpen, setIsSourceLangModalOpen] = useState(false);
  const [isTargetLangModalOpen, setIsTargetLangModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFloatingControlsOpen, setIsFloatingControlsOpen] = useState(false);
  const [isScreenOverlayOpen, setIsScreenOverlayOpen] = useState(false);
  const [isScreenSimOpen, setIsScreenSimOpen] = useState(false);
  const [customScreenSample, setCustomScreenSample] = useState<string | null>(null);

  // On-demand Permission Modal
  const [activePermissionRequest, setActivePermissionRequest] = useState<{
    type: PermissionType;
    onGranted: () => void;
    onDenied: () => void;
    onGrantInAppOnly?: () => void;
  } | null>(null);

  // Load saved configuration on mount
  useEffect(() => {
    const loadedSettings = loadUserSettings();
    setSettings(loadedSettings);
    setTargetLang(getLanguageByCode(loadedSettings.preferredTargetLanguage));
    setHistory(loadHistory());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If native overlay permission is already active in Android, sync permission
    if (androidBridge.checkOverlayPermission()) {
      const updatedPerms = savePermission('overlay', true);
      setPermissions(updatedPerms);
    }

    // Register Native Bridge Callbacks
    (window as any).onOverlayPermissionGranted = () => {
      const updated = savePermission('overlay', true);
      setPermissions(updated);
      handleUpdateSettings({ floatingTranslatorEnabled: true });
      androidBridge.startFloatingService();
      androidBridge.showToast('Floating 🔵 FHM Translate bubble activated!');
      setActivePermissionRequest(null);
    };

    (window as any).onOverlayPermissionDenied = () => {
      androidBridge.showToast('Overlay permission needed to display floating bubble over other apps');
      setActivePermissionRequest(null);
    };

    (window as any).onScreenCaptureStarted = () => {
      const updated = savePermission('screenCapture', true);
      setPermissions(updated);
      setIsScreenOverlayOpen(true);
      setActivePermissionRequest(null);
    };

    (window as any).onScreenCaptureDenied = () => {
      androidBridge.showToast('Screen capture permission was cancelled');
      setActivePermissionRequest(null);
    };

    // If floating service is enabled, start service
    if (loadedSettings.floatingTranslatorEnabled) {
      androidBridge.startFloatingService();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveUserSettings(updated);
    if (newSettings.preferredTargetLanguage) {
      setTargetLang(getLanguageByCode(newSettings.preferredTargetLanguage));
    }
  };

  const handleSelectSourceLang = (lang: Language) => {
    setSourceLang(lang);
    if (lang.code !== 'auto') {
      const recents = [lang.code, ...settings.recentLanguages.filter((c) => c !== lang.code)].slice(0, 8);
      handleUpdateSettings({ recentLanguages: recents });
    }
  };

  const handleSelectTargetLang = (lang: Language) => {
    setTargetLang(lang);
    const recents = [lang.code, ...settings.recentLanguages.filter((c) => c !== lang.code)].slice(0, 8);
    handleUpdateSettings({
      preferredTargetLanguage: lang.code,
      recentLanguages: recents,
    });
  };

  const handleSwapLanguages = () => {
    if (sourceLang.code === 'auto') return;
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSourceLang(oldTarget);
    setTargetLang(oldSource);
    handleUpdateSettings({ preferredTargetLanguage: oldSource.code });
  };

  const handleToggleFavoriteLanguage = (code: string) => {
    const exists = settings.favoriteLanguages.includes(code);
    const updated = exists
      ? settings.favoriteLanguages.filter((c) => c !== code)
      : [...settings.favoriteLanguages, code];
    handleUpdateSettings({ favoriteLanguages: updated });
  };

  // Permission requests
  const requestSpecificPermission = (type: PermissionType): Promise<boolean> => {
    return new Promise((resolve) => {
      // If already granted, proceed
      if (permissions[type]) {
        resolve(true);
        return;
      }

      // Check native Android overlay permission directly
      if (type === 'overlay' && androidBridge.checkOverlayPermission()) {
        const updated = savePermission('overlay', true);
        setPermissions(updated);
        resolve(true);
        return;
      }

      setActivePermissionRequest({
        type,
        onGranted: async () => {
          if (type === 'overlay') {
            await androidBridge.requestOverlayPermission();
          } else if (type === 'screenCapture') {
            await androidBridge.requestScreenCapture();
          }
          const updated = savePermission(type, true);
          setPermissions(updated);
          setActivePermissionRequest(null);
          resolve(true);
        },
        onGrantInAppOnly: () => {
          const updated = savePermission(type, true);
          setPermissions(updated);
          setActivePermissionRequest(null);
          resolve(true);
        },
        onDenied: () => {
          setActivePermissionRequest(null);
          resolve(false);
        },
      });
    });
  };

  // Trigger floating screen scan
  const handleTriggerScreenScan = async () => {
    const hasPermission = await requestSpecificPermission('screenCapture');
    if (!hasPermission) return;
    setIsScreenOverlayOpen(true);
  };

  const handleToggleFloatingBubble = async () => {
    if (!settings.floatingTranslatorEnabled) {
      // Check overlay permission
      const hasOverlay = androidBridge.checkOverlayPermission() || permissions.overlay;
      if (!hasOverlay) {
        const granted = await requestSpecificPermission('overlay');
        if (!granted) return;
      }
      handleUpdateSettings({ floatingTranslatorEnabled: true });
      androidBridge.startFloatingService();
      androidBridge.showToast('Floating 🔵 FHM Translate bubble activated!');
    } else {
      handleUpdateSettings({ floatingTranslatorEnabled: false });
      androidBridge.stopFloatingService();
      androidBridge.showToast('Floating bubble disabled');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Onboarding for first launch */}
      {!settings.hasCompletedOnboarding && (
        <FirstLaunchOnboarding
          onComplete={(preferredLangCode) => {
            handleUpdateSettings({
              preferredTargetLanguage: preferredLangCode,
              hasCompletedOnboarding: true,
            });
            setTargetLang(getLanguageByCode(preferredLangCode));
          }}
        />
      )}

      {/* Main Header */}
      <Header
        settings={settings}
        isOnline={isOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onToggleFloating={handleToggleFloatingBubble}
        onOpenScreenSim={() => setIsScreenSimOpen(true)}
      />

      {/* Navigation Tabs Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-center">
        <div className="flex items-center space-x-1 sm:space-x-2 w-full max-w-2xl justify-between">
          <button
            id="tab-text"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span className="hidden xs:inline">Text</span>
          </button>

          <button
            id="tab-voice"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'voice'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden xs:inline">Voice</span>
          </button>

          <button
            id="tab-camera"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'camera'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden xs:inline">Camera</span>
          </button>

          <button
            id="tab-image"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'image'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden xs:inline">Gallery</span>
          </button>

          <button
            id="tab-screen-scan"
            onClick={handleTriggerScreenScan}
            title="Screen Translation Overlay"
            className="py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md flex items-center space-x-1 transition-all hover:from-sky-500 hover:to-blue-500 shrink-0"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">Screen</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col items-center">
        {/* Ad Banner placeholder */}
        <AdBanner />

        {/* Tab 1: Text Translator */}
        {activeTab === 'text' && (
          <MainTranslator
            settings={settings}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onOpenSourceLangSelector={() => setIsSourceLangModalOpen(true)}
            onOpenTargetLangSelector={() => setIsTargetLangModalOpen(true)}
            onSwapLanguages={handleSwapLanguages}
            onSelectTargetLang={(code) => handleSelectTargetLang(getLanguageByCode(code))}
          />
        )}

        {/* Tab 2: Voice Translator */}
        {activeTab === 'voice' && (
          <VoiceTranslator
            settings={settings}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onOpenSourceLangSelector={() => setIsSourceLangModalOpen(true)}
            onOpenTargetLangSelector={() => setIsTargetLangModalOpen(true)}
            onRequestMicPermission={() => requestSpecificPermission('microphone')}
            onSwapLanguages={handleSwapLanguages}
          />
        )}

        {/* Tab 3: Camera Translator */}
        {activeTab === 'camera' && (
          <CameraTranslator
            settings={settings}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onRequestCameraPermission={() => requestSpecificPermission('camera')}
            onClose={() => setActiveTab('text')}
          />
        )}

        {/* Tab 4: Gallery Image Translator */}
        {activeTab === 'image' && (
          <ImageTranslator
            settings={settings}
            sourceLang={sourceLang}
            targetLang={targetLang}
          />
        )}
      </main>

      {/* Floating 🔵 FHM Bubble on top of the UI */}
      {settings.floatingTranslatorEnabled && (
        <FloatingBubble
          settings={settings}
          onUpdatePosition={(pos, side) =>
            handleUpdateSettings({
              floatingBubblePosition: pos,
              ...(side ? { floatingEdgeSide: side } : {}),
            })
          }
          onOpenControls={() => setIsFloatingControlsOpen(true)}
          onTriggerScreenScan={handleTriggerScreenScan}
          onClose={() => {
            handleUpdateSettings({ floatingTranslatorEnabled: false });
            androidBridge.stopFloatingService();
          }}
        />
      )}

      {/* Floating Controls Modal */}
      <FloatingControlsModal
        isOpen={isFloatingControlsOpen}
        onClose={() => setIsFloatingControlsOpen(false)}
        settings={settings}
        onTriggerScreenScan={handleTriggerScreenScan}
        onOpenVoice={() => setActiveTab('voice')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDisableFloating={() => {
          handleUpdateSettings({ floatingTranslatorEnabled: false });
          androidBridge.stopFloatingService();
        }}
      />

      {/* Screen Translator Overlay */}
      <ScreenTranslatorOverlay
        isOpen={isScreenOverlayOpen}
        onClose={() => {
          setIsScreenOverlayOpen(false);
          setCustomScreenSample(null);
        }}
        settings={settings}
        customSnapshotBase64={customScreenSample}
      />

      {/* Android Screen Simulator Modal */}
      <ScreenSimModal
        isOpen={isScreenSimOpen}
        onClose={() => setIsScreenSimOpen(false)}
        settings={settings}
        onTriggerScreenScanWithSample={(text) => {
          setIsScreenOverlayOpen(true);
        }}
      />

      {/* Source Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isSourceLangModalOpen}
        onClose={() => setIsSourceLangModalOpen(false)}
        selectedCode={sourceLang.code}
        onSelect={handleSelectSourceLang}
        allowAutoDetect={true}
        title="Select Source Language"
        recentCodes={settings.recentLanguages}
        favoriteCodes={settings.favoriteLanguages}
        onToggleFavoriteLang={handleToggleFavoriteLanguage}
      />

      {/* Target Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isTargetLangModalOpen}
        onClose={() => setIsTargetLangModalOpen(false)}
        selectedCode={targetLang.code}
        onSelect={handleSelectTargetLang}
        allowAutoDetect={false}
        title="Select Preferred Target Language"
        recentCodes={settings.recentLanguages}
        favoriteCodes={settings.favoriteLanguages}
        onToggleFavoriteLang={handleToggleFavoriteLanguage}
      />

      {/* History & Favorites Modal */}
      <HistoryFavoritesModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onToggleFavorite={(id) => setHistory(toggleFavoriteHistoryItem(id))}
        onDeleteItem={(id) => setHistory(deleteHistoryItem(id))}
        onClearAll={() => {
          clearAllHistory();
          setHistory([]);
        }}
        settings={settings}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        permissions={permissions}
        onUpdateSettings={handleUpdateSettings}
        onOpenTargetLangSelector={() => setIsTargetLangModalOpen(true)}
        onOpenPermissionSettings={() => requestSpecificPermission('overlay')}
        onClearAllData={() => {
          clearAllHistory();
          setHistory([]);
          androidBridge.showToast('All local translation cache cleared.');
        }}
      />

      {/* Smart On-Demand Permission Dialog */}
      {activePermissionRequest && (
        <PermissionModal
          isOpen={true}
          permissionType={activePermissionRequest.type}
          onGrant={activePermissionRequest.onGranted}
          onDeny={activePermissionRequest.onDenied}
          onGrantInAppOnly={activePermissionRequest.onGrantInAppOnly}
        />
      )}
    </div>
  );
}
