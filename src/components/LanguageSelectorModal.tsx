import React, { useState, useMemo } from 'react';
import { Search, X, Star, Sparkles, Check, Volume2 } from 'lucide-react';
import { Language } from '../types/translation';
import { UNIVERSAL_LANGUAGES, AUTO_DETECT_LANGUAGE } from '../data/languages';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (lang: Language) => void;
  allowAutoDetect?: boolean;
  title: string;
  recentCodes: string[];
  favoriteCodes: string[];
  onToggleFavoriteLang: (code: string) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCode,
  onSelect,
  allowAutoDetect = false,
  title,
  recentCodes,
  favoriteCodes,
  onToggleFavoriteLang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');

  const allLanguagesList = useMemo(() => {
    const list = [...UNIVERSAL_LANGUAGES];
    if (allowAutoDetect) {
      return [AUTO_DETECT_LANGUAGE, ...list];
    }
    return list;
  }, [allowAutoDetect]);

  const filteredLanguages = useMemo(() => {
    let base = allLanguagesList;
    if (activeTab === 'recent') {
      base = allLanguagesList.filter(
        (l) => l.code === 'auto' || recentCodes.includes(l.code)
      );
    } else if (activeTab === 'favorites') {
      base = allLanguagesList.filter((l) => favoriteCodes.includes(l.code));
    }

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase().trim();
    return base.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.group && l.group.toLowerCase().includes(q))
    );
  }, [allLanguagesList, activeTab, recentCodes, favoriteCodes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Field */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by language, country, or native name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 mt-3 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Languages ({UNIVERSAL_LANGUAGES.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                activeTab === 'favorites'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Favorites ({favoriteCodes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Recent ({recentCodes.length})
            </button>
          </div>
        </div>

        {/* Language List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 divide-y divide-slate-800/50">
          {filteredLanguages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No languages matching "{searchQuery}"
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const isSelected = selectedCode.toLowerCase() === lang.code.toLowerCase();
              const isFav = favoriteCodes.includes(lang.code);

              return (
                <div
                  key={lang.code}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-200'
                  }`}
                  onClick={() => {
                    onSelect(lang);
                    onClose();
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xl shrink-0">{lang.flag}</span>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm truncate">{lang.name}</span>
                        {lang.code === 'auto' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">
                            SMART
                          </span>
                        )}
                        {lang.supportsTTS && (
                          <span title="Audio Pronunciation available" className="inline-flex">
                            <Volume2 className="w-3 h-3 text-slate-400 inline shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <span>{lang.nativeName}</span>
                        <span>•</span>
                        <span className="uppercase text-[10px] tracking-wider text-slate-400 font-mono">
                          {lang.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {lang.code !== 'auto' && (
                      <button
                        onClick={() => onToggleFavoriteLang(lang.code)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isFav
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-400 hover:text-slate-300'
                        }`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    )}

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 text-center text-xs text-slate-400">
          Supporting 100+ worldwide languages in FHM Translate
        </div>
      </div>
    </div>
  );
};
