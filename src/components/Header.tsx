import React from 'react';
import { Sparkles, History, Settings, Layers, Wifi, WifiOff } from 'lucide-react';
import { UserSettings } from '../types/translation';

interface HeaderProps {
  settings: UserSettings;
  isOnline: boolean;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onToggleFloating: () => void;
  onOpenScreenSim: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  isOnline,
  onOpenSettings,
  onOpenHistory,
  onToggleFloating,
  onOpenScreenSim,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 shadow-md shadow-blue-500/20 text-white font-bold text-lg tracking-wider">
          <span>FHM</span>
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="font-display font-extrabold text-lg text-white tracking-tight leading-none">
              FHM Translate
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              PRO
            </span>
          </div>
          <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-slate-400">
            {isOnline ? (
              <span className="flex items-center text-emerald-400 text-[11px]">
                <Wifi className="w-3 h-3 mr-1" /> Universal Cloud
              </span>
            ) : (
              <span className="flex items-center text-amber-400 text-[11px]">
                <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
              </span>
            )}
            <span>•</span>
            <span className="text-slate-400 text-[11px] truncate max-w-[110px]">
              Dev: Fakhrul Islam
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-1.5">
        {/* Floating Bubble Quick Toggle */}
        <button
          id="btn-toggle-floating-header"
          onClick={onToggleFloating}
          title="Toggle Floating Screen Translator"
          className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            settings.floatingTranslatorEnabled
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${settings.floatingTranslatorEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
          <span className="hidden sm:inline">Floating</span>
          <span>{settings.floatingTranslatorEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Screen Sim / Preview Mode */}
        <button
          id="btn-open-screen-sim"
          onClick={onOpenScreenSim}
          title="Simulate Floating Translator Over Android Apps"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* History & Saved */}
        <button
          id="btn-open-history"
          onClick={onOpenHistory}
          title="Translation History & Favorites"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          title="Settings & About"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
