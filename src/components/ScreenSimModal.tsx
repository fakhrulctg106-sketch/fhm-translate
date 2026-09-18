import React, { useState } from 'react';
import {
  Smartphone,
  X,
  Scan,
  MessageSquare,
  Globe,
  FileText,
  Sparkles,
  Move,
  Info,
} from 'lucide-react';
import { UserSettings } from '../types/translation';
import { getLanguageByCode } from '../data/languages';

interface ScreenSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onTriggerScreenScanWithSample: (sampleText: string) => void;
}

export const ScreenSimModal: React.FC<ScreenSimModalProps> = ({
  isOpen,
  onClose,
  settings,
  onTriggerScreenScanWithSample,
}) => {
  const [selectedApp, setSelectedApp] = useState<'chat' | 'news' | 'social'>('chat');

  if (!isOpen) return null;

  const targetLang = getLanguageByCode(settings.preferredTargetLanguage);

  const sampleApps = {
    chat: {
      name: 'ChatApp (Italian)',
      lang: 'Italian (it)',
      badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
      content: [
        { sender: 'Marco', time: '10:14 AM', text: 'Ciao! Come stai? Ci vediamo oggi per il pranzo?' },
        { sender: 'Me', time: '10:15 AM', text: 'Sì certamente, a che ora preferisci andare?' },
        { sender: 'Marco', time: '10:16 AM', text: 'Verso le 13:00 al ristorante vicino al duomo. Fammi sapere se va bene per te!' },
      ],
      fullText: 'Ciao! Come stai? Ci vediamo oggi per il pranzo? Verso le 13:00 al ristorante vicino al duomo. Fammi sapere se va bene per te!',
    },
    news: {
      name: 'Global News (Bengali)',
      lang: 'Bengali (bn)',
      badgeColor: 'bg-amber-950/60 text-amber-400 border-amber-800',
      content: [
        { sender: 'Daily News', time: 'Headline', text: 'বিজ্ঞান ও প্রযুক্তির নতুন দিগন্ত: বিশ্বজুড়ে অনুবাদ প্রযুক্তির অভূতপূর্ব উন্নয়ন।' },
        { sender: 'Editorial', time: 'Story', text: 'আধুনিক কৃত্রিম বুদ্ধিমত্তা মানুষের মধ্যকার ভাষার বাধা দূর করে একে অপরকে কাছাকাছি আনছে।' },
      ],
      fullText: 'বিজ্ঞান ও প্রযুক্তির নতুন দিগন্ত: বিশ্বজুড়ে অনুবাদ প্রযুক্তির অভূতপূর্ব উন্নয়ন। আধুনিক কৃত্রিম বুদ্ধিমত্তা মানুষের মধ্যকার ভাষার বাধা দূর করে একে অপরকে কাছাকাছি আনছে।',
    },
    social: {
      name: 'Social Feed (Arabic & Spanish)',
      lang: 'Arabic & Spanish',
      badgeColor: 'bg-purple-950/60 text-purple-400 border-purple-800',
      content: [
        { sender: 'Amir (Riyadh)', time: '2m ago', text: 'مرحباً بالجميع! أتمنى لكم يوماً سعيداً ومليئاً بالنجاح والتوفيق.' },
        { sender: 'Elena (Madrid)', time: '5m ago', text: '¡Qué hermoso día en la ciudad! Disfrutando de la brisa y el sol de la tarde.' },
      ],
      fullText: 'مرحباً بالجميع! أتمنى لكم يوماً سعيداً ومليئاً بالنجاح والتوفيق. ¡Qué hermoso día en la ciudad! Disfrutando de la brisa y el sol de la tarde.',
    },
  };

  const current = sampleApps[selectedApp];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-display font-bold text-sm text-white">
                Android Screen Simulator
              </h2>
              <p className="text-[11px] text-slate-400">
                Drag the floating 🔵 FHM bubble over any text block below & release to translate!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* App Switcher Tabs */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Simulated App:</span>
          <button
            onClick={() => setSelectedApp('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedApp === 'chat'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💬 Italian Chat
          </button>
          <button
            onClick={() => setSelectedApp('news')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedApp === 'news'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📰 Bengali News
          </button>
          <button
            onClick={() => setSelectedApp('social')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedApp === 'social'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🌐 Arabic & Spanish
          </button>
        </div>

        {/* Interactive Simulated Screen */}
        <div className="relative flex-1 p-4 bg-slate-950 overflow-y-auto min-h-[380px] flex flex-col justify-between">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-white">{current.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${current.badgeColor}`}>
                Source: {current.lang}
              </span>
            </div>

            <div className="space-y-3 py-1">
              {current.content.map((item, idx) => (
                <div
                  key={idx}
                  data-translate-text={item.text}
                  className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-sky-500/60 transition-all space-y-1.5 shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span className="text-sky-300">{item.sender}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-100 leading-relaxed font-medium">
                    {item.text}
                  </p>
                  <div className="text-[10px] text-slate-500 group-hover:text-sky-400 flex items-center space-x-1 pt-0.5">
                    <Move className="w-3 h-3" />
                    <span>Drop FHM Bubble here to translate</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Action Bar */}
          <div className="mt-4 p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between">
            <div className="text-xs text-blue-200">
              <span className="font-bold">Target Language: </span>
              <span>{targetLang.flag} {targetLang.name}</span>
            </div>

            <button
              onClick={() => {
                onClose();
                onTriggerScreenScanWithSample(current.fullText);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30 flex items-center space-x-1.5 transition-all"
            >
              <Scan className="w-4 h-4" />
              <span>Full Screen Scan</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-center space-x-1.5 text-center text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Bubble automatically docks to nearest edge and collapses into a sleek handle after 3.5s.</span>
        </div>
      </div>
    </div>
  );
};
