import React from 'react';
import {
  Settings,
  X,
  Globe,
  Sliders,
  Sparkles,
  Volume2,
  Shield,
  Layers,
  Info,
  Check,
  Smartphone,
  ExternalLink,
  RotateCcw,
  Download,
} from 'lucide-react';
import { UserSettings, Language, PermissionStatus } from '../types/translation';
import { getLanguageByCode } from '../data/languages';
import { androidBridge } from '../services/androidBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  permissions: PermissionStatus;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenTargetLangSelector: () => void;
  onOpenPermissionSettings: () => void;
  onClearAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  permissions,
  onUpdateSettings,
  onOpenTargetLangSelector,
  onOpenPermissionSettings,
  onClearAllData,
}) => {
  if (!isOpen) return null;

  const targetLang = getLanguageByCode(settings.preferredTargetLanguage);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="font-display font-bold text-lg text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 divide-y divide-slate-800/80">
          {/* Section 1: Default Target Language */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Globe className="w-4 h-4" />
              <span>Preferred Target Language</span>
            </h3>
            <p className="text-xs text-slate-400">
              Your default translation language (Bengali, Italian, English, Arabic, etc.). Every user can configure their own preferred language.
            </p>

            <button
              id="btn-settings-target-lang"
              onClick={onOpenTargetLangSelector}
              className="w-full px-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{targetLang.flag}</span>
                <div>
                  <div className="font-bold text-sm text-white">{targetLang.name}</div>
                  <div className="text-xs text-slate-400">{targetLang.nativeName} ({targetLang.code.toUpperCase()})</div>
                </div>
              </div>
              <span className="text-xs text-blue-400 font-semibold">Change</span>
            </button>
          </div>

          {/* Section 2: Floating Translator */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4" />
              <span>Floating Screen Translator</span>
            </h3>

            {/* Toggle */}
            <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <div>
                <div className="font-semibold text-sm text-white">Enable Floating Bubble</div>
                <div className="text-xs text-slate-400">Show 🔵 FHM over all Android apps</div>
              </div>
              <button
                id="btn-settings-floating-toggle"
                onClick={() => {
                  const nextVal = !settings.floatingTranslatorEnabled;
                  onUpdateSettings({ floatingTranslatorEnabled: nextVal });
                  if (nextVal) {
                    androidBridge.startFloatingService();
                  } else {
                    androidBridge.stopFloatingService();
                  }
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.floatingTranslatorEnabled ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.floatingTranslatorEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Bubble Size */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Bubble Size</label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdateSettings({ floatingBubbleSize: size })}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      settings.floatingBubbleSize === size
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Dock to edge */}
            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">Snap to Screen Edge</div>
                <div className="text-[11px] text-slate-400">Auto-dock bubble when released</div>
              </div>
              <input
                type="checkbox"
                checked={settings.floatingDockToEdge}
                onChange={(e) => onUpdateSettings({ floatingDockToEdge: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
            </div>
          </div>

          {/* Section 3: Speech & Audio (TTS) */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Voice & Pronunciation</span>
            </h3>

            {/* Speech Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Speech Playback Speed</span>
                <span className="font-mono text-blue-400 font-bold">{settings.speechSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.speechSpeed}
                onChange={(e) => onUpdateSettings({ speechSpeed: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>

            {/* Auto speak */}
            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Pronounce Translations</div>
                <div className="text-[11px] text-slate-400">Play audio automatically after translating</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => onUpdateSettings({ autoSpeak: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
            </div>
          </div>

          {/* Section 4: Privacy & Permissions */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-4 h-4" />
              <span>Privacy & Permissions</span>
            </h3>
            <p className="text-xs text-slate-400">
              Permissions are requested only when you use specific features.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span>Display Over Other Apps (Overlay)</span>
                <span className={`font-semibold ${permissions.overlay ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {permissions.overlay ? 'Granted' : 'On-Demand'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span>Accessibility (Screen Text Reader - Hi Translate)</span>
                <span className="font-semibold text-sky-400">
                  Required for Screen Scan
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span>Camera (OCR Capture)</span>
                <span className={`font-semibold ${permissions.camera ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {permissions.camera ? 'Granted' : 'On-Demand'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span>Microphone (Voice Translate)</span>
                <span className={`font-semibold ${permissions.microphone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {permissions.microphone ? 'Granted' : 'On-Demand'}
                </span>
              </div>
            </div>

            {/* Hi Translate Accessibility Service Card */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-slate-300 space-y-2.5">
              <div className="font-bold text-sky-300 text-xs flex items-center justify-between">
                <span>⚡ Hi Translate মোড: স্ক্রিনের লেখার ওপর ধরে রাখলে তাৎক্ষণিক অনুবাদ</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                হোয়াটসঅ্যাপ, ফেসবুক, মেসেঞ্জার বা যেকোনো অ্যাপের লেখার ওপর বাবলটি ছেড়ে দিলে তাৎক্ষণিকভাবে অনুবাদ করার জন্য অ্যান্ড্রয়েডের <strong>Accessibility Service</strong> প্রয়োজন। নিচের বাটনে চাপ দিয়ে তালিকা থেকে <strong>FHM Translate</strong> চালু (On) করে নিন।
              </p>
              <button
                onClick={() => androidBridge.openAccessibilitySettings()}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-900/40 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Accessibility Settings (অ্যাক্সেসিবিলিটি অন করুন)</span>
              </button>
            </div>

            {/* Android 13/14 Restricted Setting Fix */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-amber-300 text-[11px] flex items-center justify-between">
                <span>Android 13/14: "App was denied access" বা লক সমস্যা?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                নতুন ইনস্টল করা অ্যাপে গুগল সিকিউরিটি পারমিশন সাময়িকভাবে লক রাখে। নিচের বাটনে চাপ দিয়ে অ্যাপ ইনফো পেজে গিয়ে <strong>উপরের ডানদিকের ৩টি ডট (⋮)</strong> চাপুন এবং <strong>"Allow restricted settings"</strong> দিন। এরপর পারমিশন সুইচটি অন হয়ে যাবে।
              </p>
              <button
                onClick={() => androidBridge.openAppDetailsSettings()}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open App Info Settings (৩টি ডট আনলক পেজ খুলুন)</span>
              </button>
            </div>
          </div>

          {/* Section 5: Android APK & Export */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Download className="w-4 h-4" />
              <span>Android APK Download (গিটহাব অটোমেটিক বিল্ড)</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>📦 How to get the APK / কিভাবে APK পাবেন</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  GitHub CI/CD Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed space-y-1">
                <span className="block font-medium text-slate-200">১. প্রজেক্টটি GitHub-এ এক্সপোর্ট করুন (Settings &gt; Export to GitHub)।</span>
                <span className="block text-slate-400">২. GitHub Actions ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে <strong>FHM-Translate-v1.0.apk</strong> বিল্ড করে ফেলবে।</span>
                <span className="block text-slate-400">৩. আপনার GitHub রিপোজিটরির <strong>Releases</strong> বা <strong>Actions &gt; Artifacts</strong> থেকে সরাসরি APK ডাউনলোড করে ফোনে ইনস্টল করুন।</span>
              </p>
            </div>
          </div>

          {/* Section 6: App Information & Developer Credit */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Info className="w-4 h-4" />
              <span>About FHM Translate</span>
            </h3>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">FHM Translate</span>
                <span className="text-xs font-mono text-blue-400">v1.0.0</span>
              </div>
              <p className="text-xs text-slate-300">
                Universal translation system supporting 100+ worldwide languages, screen scanner, floating bubble, voice, and camera OCR.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Developer:</span>
                <span className="font-bold text-sky-300">Fakhrul Islam</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
