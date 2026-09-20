import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftRight,
  Sparkles,
  Volume2,
  Copy,
  Share2,
  Star,
  X,
  RotateCcw,
  Check,
  Languages,
  BookOpen,
  Clipboard,
  Send,
  Zap,
} from 'lucide-react';
import { Language, UserSettings, TranslationItem } from '../types/translation';
import { getLanguageByCode } from '../data/languages';
import { requestTranslation, TranslationApiResult } from '../services/apiService';
import { androidBridge } from '../services/androidBridge';
import { saveHistoryItem } from '../services/storageService';
import { adManager } from '../services/adManager';

interface MainTranslatorProps {
  settings: UserSettings;
  onOpenSourceLangSelector: () => void;
  onOpenTargetLangSelector: () => void;
  sourceLang: Language;
  targetLang: Language;
  onSwapLanguages: () => void;
  onSelectTargetLang: (code: string) => void;
}

export const MainTranslator: React.FC<MainTranslatorProps> = ({
  settings,
  onOpenSourceLangSelector,
  onOpenTargetLangSelector,
  sourceLang,
  targetLang,
  onSwapLanguages,
}) => {
  const [inputText, setInputText] = useState('');
  const [translationResult, setTranslationResult] = useState<TranslationApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Automatic Instant Live Translation as user types or changes language
  useEffect(() => {
    const textToTranslate = inputText.trim();

    if (!textToTranslate) {
      setTranslationResult(null);
      setErrorMsg(null);
      setIsLoading(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await requestTranslation(
          textToTranslate,
          sourceLang.code,
          targetLang.code
        );

        if (!isMountedRef.current) return;

        setTranslationResult(result);
        setErrorMsg(null);

        // Save to History silently
        const saved = saveHistoryItem({
          originalText: result.originalText,
          translatedText: result.translatedText,
          sourceLang: result.sourceLang,
          targetLang: result.targetLang,
          detectedLang: result.detectedLang,
          detectedLangName: result.detectedLangName,
          mode: 'text',
        });
        setCurrentHistoryId(saved.id);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.error('Auto translation error:', err);
        setErrorMsg(err.message || 'Translation failed. Please check network connection.');
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, 380); // 380ms debounce for natural typing speed

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [inputText, sourceLang.code, targetLang.code]);

  const handleManualTranslate = async () => {
    if (!inputText.trim()) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await requestTranslation(
        inputText.trim(),
        sourceLang.code,
        targetLang.code
      );

      setTranslationResult(result);

      const saved = saveHistoryItem({
        originalText: result.originalText,
        translatedText: result.translatedText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        detectedLang: result.detectedLang,
        detectedLangName: result.detectedLangName,
        mode: 'text',
      });
      setCurrentHistoryId(saved.id);

      adManager.incrementAction();

      if (settings.autoSpeak) {
        androidBridge.speak(result.translatedText, targetLang.code, settings.speechSpeed);
      }
    } catch (err: any) {
      console.error('Manual translation error:', err);
      setErrorMsg(err.message || 'Translation failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setInputText('');
    setTranslationResult(null);
    setErrorMsg(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleCopy = () => {
    if (!translationResult) return;
    navigator.clipboard.writeText(translationResult.translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!translationResult) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FHM Translation',
          text: `${translationResult.translatedText}\n\n(Original: ${translationResult.originalText})`,
        });
      } catch (e) {
        // Share cancelled
      }
    } else {
      handleCopy();
      androidBridge.showToast('Translation copied to clipboard for sharing!');
    }
  };

  const handleSpeak = (text: string, langCode: string) => {
    androidBridge.speak(text, langCode, settings.speechSpeed);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Language Bar Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex items-center justify-between shadow-lg">
        {/* Source Language Button */}
        <button
          id="btn-select-source-lang"
          onClick={onOpenSourceLangSelector}
          className="flex-1 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center space-x-2 text-left min-w-0"
        >
          <span className="text-xl shrink-0">{sourceLang.flag}</span>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              From
            </div>
            <div className="text-sm font-bold text-white truncate flex items-center space-x-1">
              <span>{sourceLang.name}</span>
            </div>
          </div>
        </button>

        {/* Swap Button */}
        <button
          id="btn-swap-languages"
          onClick={onSwapLanguages}
          disabled={sourceLang.code === 'auto'}
          title={sourceLang.code === 'auto' ? 'Cannot swap auto-detect' : 'Swap languages'}
          className="p-2.5 mx-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-blue-400 hover:text-white transition-all transform active:rotate-180"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* Target Language Button */}
        <button
          id="btn-select-target-lang"
          onClick={onOpenTargetLangSelector}
          className="flex-1 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center space-x-2 text-left min-w-0 justify-end sm:justify-start"
        >
          <span className="text-xl shrink-0">{targetLang.flag}</span>
          <div className="truncate">
            <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
              To
            </div>
            <div className="text-sm font-bold text-white truncate">
              {targetLang.name}
            </div>
          </div>
        </button>
      </div>

      {/* Input Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 relative group focus-within:border-blue-500/60 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
          <div className="flex items-center space-x-2 font-semibold">
            <span>{sourceLang.name}</span>
            {translationResult?.detectedLangName && sourceLang.code === 'auto' && (
              <span className="text-emerald-400 font-normal">
                (Detected: {translationResult.detectedLangName})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!inputText && (
              <button
                onClick={handlePaste}
                className="flex items-center space-x-1 text-slate-400 hover:text-blue-400 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}
            {inputText && (
              <button
                onClick={handleClear}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <textarea
          id="input-translate-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleManualTranslate();
            }
          }}
          placeholder={`Enter text in ${sourceLang.name === 'Auto Detect' ? 'any language' : sourceLang.name}...`}
          rows={4}
          dir={sourceLang.isRTL ? 'rtl' : 'ltr'}
          className="w-full bg-transparent text-white placeholder-slate-500 text-base leading-relaxed focus:outline-none resize-none font-normal"
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <div className="flex items-center space-x-2">
            {inputText && (
              <button
                onClick={() => handleSpeak(inputText, sourceLang.code === 'auto' ? 'en' : sourceLang.code)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Listen original"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <span className="text-[11px] text-slate-500 font-mono">
              {inputText.length} chars
            </span>
            {inputText.trim() && (
              <span className="hidden xs:flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Zap className="w-2.5 h-2.5 animate-pulse" />
                <span>Auto-translating</span>
              </span>
            )}
          </div>

          <button
            id="btn-submit-translate"
            onClick={handleManualTranslate}
            disabled={!inputText.trim() || isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all transform active:scale-95"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Card */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-start justify-between space-x-2 animate-shake">
          <div>
            <div className="font-bold text-rose-300 mb-0.5">Translation Error</div>
            <div>{errorMsg}</div>
          </div>
          <button
            onClick={handleManualTranslate}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs shrink-0 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Translation Result Card */}
      {translationResult && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-4 shadow-2xl shadow-blue-950/50 space-y-3 animate-fade-in relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />

          {/* Header */}
          <div className="flex items-center justify-between text-xs text-blue-400 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 font-bold">
              <span>{targetLang.flag}</span>
              <span>{targetLang.name}</span>
              <span className="text-[10px] text-slate-400 font-normal font-mono uppercase">
                ({targetLang.code})
              </span>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => handleSpeak(translationResult.translatedText, targetLang.code)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title="Listen translation"
              >
                <Volume2 className="w-4 h-4 text-sky-400" />
              </button>

              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy translation"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title="Share translation"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Translated Content */}
          <div
            dir={targetLang.isRTL ? 'rtl' : 'ltr'}
            className="text-white text-lg font-medium leading-relaxed select-text py-1"
          >
            {translationResult.translatedText}
          </div>

          {/* Phonetics / Transliteration if available */}
          {translationResult.phonetic && (
            <div className="text-xs text-sky-300/80 italic bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              Pronunciation: {translationResult.phonetic}
            </div>
          )}

          {/* Alternative Translations */}
          {translationResult.alternativeTranslations &&
            translationResult.alternativeTranslations.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Alternative expressions:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {translationResult.alternativeTranslations.map((alt, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700/60"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
