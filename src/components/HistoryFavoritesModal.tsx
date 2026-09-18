import React, { useState } from 'react';
import {
  History,
  Star,
  Trash2,
  X,
  Search,
  Volume2,
  Copy,
  Check,
  Languages,
  Mic,
  Scan,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { TranslationItem, UserSettings } from '../types/translation';
import { getLanguageByCode } from '../data/languages';
import { androidBridge } from '../services/androidBridge';

interface HistoryFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TranslationItem[];
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  settings: UserSettings;
}

export const HistoryFavoritesModal: React.FC<HistoryFavoritesModalProps> = ({
  isOpen,
  onClose,
  history,
  onToggleFavorite,
  onDeleteItem,
  onClearAll,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = history.filter((item) => {
    if (activeTab === 'favorites' && !item.isFavorite) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      item.originalText.toLowerCase().includes(q) ||
      item.translatedText.toLowerCase().includes(q) ||
      item.sourceLang.toLowerCase().includes(q) ||
      item.targetLang.toLowerCase().includes(q)
    );
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, langCode: string) => {
    androidBridge.speak(text, langCode, settings.speechSpeed);
  };

  const getModeIcon = (mode: TranslationItem['mode']) => {
    switch (mode) {
      case 'voice':
        return <Mic className="w-3 h-3 text-emerald-400" />;
      case 'screen':
        return <Scan className="w-3 h-3 text-sky-400" />;
      case 'camera':
        return <Camera className="w-3 h-3 text-amber-400" />;
      case 'image':
        return <ImageIcon className="w-3 h-3 text-indigo-400" />;
      default:
        return <Languages className="w-3 h-3 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="font-display font-bold text-lg text-white">
              History & Favorites
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="px-4 pt-3 pb-2 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All History ({history.length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Favorites ({history.filter((h) => h.isFavorite).length})</span>
              </button>
            </div>

            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all translation history?')) {
                    onClearAll();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search saved translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p>No saved translations found</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const src = getLanguageByCode(item.sourceLang);
              const tgt = getLanguageByCode(item.targetLang);

              return (
                <div
                  key={item.id}
                  className="pt-2.5 pb-1 space-y-1.5 hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      {getModeIcon(item.mode)}
                      <span>
                        {src.flag} {src.name} → {tgt.flag} {tgt.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onToggleFavorite(item.id)}
                        className="p-1 hover:text-amber-400"
                        title="Toggle Favorite"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            item.isFavorite
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-500'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 hover:text-rose-400 text-slate-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300">{item.originalText}</div>
                  <div className="text-sm font-semibold text-sky-300 flex items-start justify-between">
                    <span>{item.translatedText}</span>
                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleSpeak(item.translatedText, item.targetLang)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(item.id, item.translatedText)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
