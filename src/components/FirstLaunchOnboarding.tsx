import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  ArrowRight,
  Layers,
  Mic,
  Camera,
  Check,
} from 'lucide-react';
import { Language } from '../types/translation';
import { UNIVERSAL_LANGUAGES } from '../data/languages';

interface FirstLaunchOnboardingProps {
  onComplete: (preferredLangCode: string) => void;
}

export const FirstLaunchOnboarding: React.FC<FirstLaunchOnboardingProps> = ({
  onComplete,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('bn'); // default Bengali or user choice
  const [step, setStep] = useState<1 | 2>(1);

  const topLanguageChoices = [
    { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇧🇩' },
    { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
    { code: 'en', name: 'English (English)', flag: '🇺🇸' },
    { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
    { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
    { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
    { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
    { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-6 animate-fade-in text-white overflow-y-auto">
      {/* Top Brand Logo */}
      <div className="pt-8 flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-2xl font-black shadow-2xl shadow-blue-500/30">
          FHM
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
            FHM Translate
          </h1>
          <p className="text-xs text-blue-400 font-medium mt-0.5">
            Developer: Fakhrul Islam
          </p>
        </div>
      </div>

      {/* Step 1: Welcome & Target Language Choice */}
      {step === 1 && (
        <div className="w-full max-w-md space-y-6 my-auto text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">What is your primary language?</h2>
            <p className="text-xs text-slate-400">
              FHM Translate translates any foreign language into your preferred language.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-left">
            {topLanguageChoices.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-xs font-semibold truncate">{lang.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Key Features Overview */}
      {step === 2 && (
        <div className="w-full max-w-md space-y-6 my-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">You're Ready to Translate!</h2>
            <p className="text-xs text-slate-400">
              Powerful tools designed for fast, seamless multilingual communication.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Floating 🔵 FHM Bubble</div>
                <div className="text-[11px] text-slate-400">Translate directly inside WhatsApp, social media, and web pages</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Voice & Dual Conversation</div>
                <div className="text-[11px] text-slate-400">Speak fluently with people in any foreign country</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Camera & Image Scanner</div>
                <div className="text-[11px] text-slate-400">Instant OCR translation for menus, road signs, and documents</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onComplete(selectedLang)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
          >
            <span>Start Translating</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="pb-4 text-center text-xs text-slate-500">
        Supporting 100+ languages • Built for global users
      </div>
    </div>
  );
};
