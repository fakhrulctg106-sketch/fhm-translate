import React, { useState } from 'react';
import {
  Scan,
  Zap,
  Mic,
  X,
  Volume2,
  Copy,
  Check,
  Settings,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserSettings, Language } from '../types/translation';
import { getLanguageByCode } from '../data/languages';
import { requestTranslation } from '../services/apiService';
import { androidBridge } from '../services/androidBridge';

interface FloatingControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onTriggerScreenScan: () => void;
  onOpenVoice: () => void;
  onOpenSettings: () => void;
  onDisableFloating: () => void;
}

export const FloatingControlsModal: React.FC<FloatingControlsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onTriggerScreenScan,
  onOpenVoice,
  onOpenSettings,
  onDisableFloating,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [quickResult, setQuickResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetLang = getLanguageByCode(settings.preferredTargetLanguage);

  const handleQuickTranslate = async () => {
    if (!quickInput.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await requestTranslation(
        quickInput.trim(),
        'auto',
        settings.preferredTargetLanguage
      );
      setQuickResult(res.translatedText);
      if (settings.autoSpeak) {
        androidBridge.speak(res.translatedText, settings.preferredTargetLanguage, settings.speechSpeed);
      }
    } catch (e: any) {
      setQuickResult(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!quickResult) return;
    navigator.clipboard.writeText(quickResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!quickResult) return;
    androidBridge.speak(quickResult, settings.preferredTargetLanguage, settings.speechSpeed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-blue-900/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              FHM
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white leading-tight">
                Floating Translator
              </h3>
              <p className="text-[11px] text-blue-300">
                Target: {targetLang.flag} {targetLang.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Action 1: Screen Translation */}
            <button
              id="btn-trigger-screen-ocr"
              onClick={() => {
                onClose();
                onTriggerScreenScan();
              }}
              className="p-3 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/40 flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Scan className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-white">Screen Translate</span>
              <span className="text-[10px] text-blue-300">OCR on-screen text</span>
            </button>

            {/* Action 2: Voice Translation */}
            <button
              onClick={() => {
                onClose();
                onOpenVoice();
              }}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-white">Voice Translate</span>
              <span className="text-[10px] text-slate-400">Speak & listen</span>
            </button>
          </div>

          {/* Quick Floating Text Input Bar */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Float Translation</span>
            </div>

            <div className="flex space-x-1.5">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickTranslate()}
                placeholder="Type or paste foreign text..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleQuickTranslate}
                disabled={isLoading || !quickInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-colors shrink-0"
              >
                {isLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {quickResult && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-blue-500/30 text-xs text-slate-100 flex items-start justify-between space-x-2">
                <div className="flex-1 font-medium">{quickResult}</div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={handleSpeak}
                    className="p-1 text-slate-400 hover:text-white rounded"
                    title="Listen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1 text-slate-400 hover:text-white rounded"
                    title="Copy"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Settings & Turn Off */}
          <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex items-center space-x-1 hover:text-slate-200"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Floating Settings</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onDisableFloating();
              }}
              className="text-rose-400 hover:text-rose-300 font-semibold"
            >
              Turn Off Bubble
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
