import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  X,
  Target,
} from 'lucide-react';
import { UserSettings } from '../types/translation';
import { getLanguageByCode } from '../data/languages';
import { requestTranslation } from '../services/apiService';
import { androidBridge } from '../services/androidBridge';
import { saveHistoryItem } from '../services/storageService';

interface FloatingBubbleProps {
  settings: UserSettings;
  onUpdatePosition: (pos: { x: number; y: number }, side?: 'left' | 'right') => void;
  onOpenControls: () => void;
  onTriggerScreenScan: () => void;
  onClose: () => void;
}

interface TranslationResultCard {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLangName?: string;
  dropX: number;
  dropY: number;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  settings,
  onUpdatePosition,
  onOpenControls,
}) => {
  // States: 'docked' (full circle at edge) | 'semi_hidden' (subtle edge handle) | 'dragging' | 'translating'
  const [bubbleState, setBubbleState] = useState<'docked' | 'semi_hidden' | 'dragging' | 'translating'>('semi_hidden');
  const [dockSide, setDockSide] = useState<'left' | 'right'>(settings.floatingEdgeSide || 'left');

  // Coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const defaultX = settings.floatingEdgeSide === 'right' ? (typeof window !== 'undefined' ? window.innerWidth - 60 : 320) : 0;
    return settings.floatingBubblePosition || { x: defaultX, y: 180 };
  });

  // Drag tracking
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [targetReticlePos, setTargetReticlePos] = useState<{ x: number; y: number } | null>(null);

  // Active translation result popup
  const [activeResult, setActiveResult] = useState<TranslationResultCard | null>(null);
  const [copied, setCopied] = useState(false);

  // Timers & refs
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number }>({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  });

  const targetLang = getLanguageByCode(settings.preferredTargetLanguage);

  // Auto-slide into edge after 3 seconds of inactivity
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setBubbleState('semi_hidden');
    }, 3000);
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Initialize edge docking on mount
  useEffect(() => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const initialSide = position.x > screenWidth / 2 ? 'right' : 'left';
    setDockSide(initialSide);

    const edgeX = initialSide === 'left' ? 0 : screenWidth - 58;
    setPosition((prev) => ({ x: edgeX, y: prev.y }));

    // Start in semi_hidden edge handle state as per Hi Translate UX
    setBubbleState('semi_hidden');
    startIdleTimer();

    return () => {
      clearIdleTimer();
      if (resultDismissTimerRef.current) clearTimeout(resultDismissTimerRef.current);
    };
  }, []);

  // Extract contextual text at dropped coordinates
  const extractTextAtCoordinates = (clientX: number, clientY: number): string => {
    if (typeof document === 'undefined') return '';

    // 1. Check window text selection
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 1) {
      return selection;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      if (el.closest('#fhm-floating-translator-root')) continue;

      // 2. Check input or textarea value
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.value?.trim()) return el.value.trim();
      }

      const sampleText = (el as HTMLElement).dataset?.translateText;
      if (sampleText && sampleText.trim()) {
        return sampleText.trim();
      }

      const text = el.textContent?.trim() || '';
      if (
        text &&
        text.length > 2 &&
        !text.includes('FHM Translate') &&
        el.tagName !== 'BODY' &&
        el.tagName !== 'HTML' &&
        el.tagName !== 'MAIN' &&
        el.tagName !== 'NAV'
      ) {
        return text.slice(0, 300);
      }
    }

    return 'Hello, welcome to FHM Screen Translator. Drag and drop this lens over any text to translate instantly into Bengali!';
  };

  // Perform translation on drop
  const handleDropTranslation = async (dropX: number, dropY: number) => {
    setBubbleState('translating');
    androidBridge.vibrate(30);

    const detectedText = extractTextAtCoordinates(dropX, dropY);

    try {
      const response = await requestTranslation(
        detectedText,
        'auto',
        settings.preferredTargetLanguage
      );

      const result: TranslationResultCard = {
        id: `drop_${Date.now()}`,
        originalText: response.originalText,
        translatedText: response.translatedText,
        sourceLang: response.sourceLang,
        targetLang: settings.preferredTargetLanguage,
        detectedLangName: response.detectedLangName,
        dropX,
        dropY,
      };

      setActiveResult(result);

      // Save to history
      saveHistoryItem({
        originalText: response.originalText,
        translatedText: response.translatedText,
        sourceLang: response.sourceLang,
        targetLang: settings.preferredTargetLanguage,
        mode: 'screen',
      });

      // Auto-speak if enabled
      if (settings.autoSpeak) {
        androidBridge.speak(response.translatedText, settings.preferredTargetLanguage, settings.speechSpeed);
      }

      // Auto-dismiss result card after 10s to leave screen clean
      if (resultDismissTimerRef.current) clearTimeout(resultDismissTimerRef.current);
      resultDismissTimerRef.current = setTimeout(() => {
        setActiveResult(null);
      }, 10000);
    } catch (err: any) {
      console.error('Drop translation failed:', err);
      setActiveResult({
        id: `drop_${Date.now()}`,
        originalText: detectedText,
        translatedText: `[${targetLang.name}] ${detectedText}`,
        sourceLang: 'auto',
        targetLang: settings.preferredTargetLanguage,
        detectedLangName: 'Auto Detect',
        dropX,
        dropY,
      });
    } finally {
      // Step 5: Automatically move towards nearest screen edge
      const screenWidth = window.innerWidth;
      const targetSide: 'left' | 'right' = dropX > screenWidth / 2 ? 'right' : 'left';
      const edgeX = targetSide === 'left' ? 0 : screenWidth - 58;
      const finalY = Math.max(65, Math.min(window.innerHeight - 80, dropY));

      setDockSide(targetSide);
      setPosition({ x: edgeX, y: finalY });
      onUpdatePosition({ x: edgeX, y: finalY }, targetSide);

      // Keep circular initially at edge
      setBubbleState('docked');

      // After short idle period, slide mostly inside the edge again
      startIdleTimer();
    }
  };

  // Drag Gesture Handlers
  const handleStartDrag = (clientX: number, clientY: number) => {
    clearIdleTimer();
    setIsDragging(true);
    setHasMoved(false);

    let startPosX = position.x;
    if (bubbleState === 'semi_hidden') {
      const screenWidth = window.innerWidth;
      startPosX = dockSide === 'left' ? 4 : screenWidth - 60;
    }

    dragStartRef.current = {
      clientX,
      clientY,
      posX: startPosX,
      posY: position.y,
    };
  };

  const handleMoveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;
    const dist = Math.hypot(dx, dy);

    // Only switch to dragging mode if moved beyond intentional touch threshold (16px)
    if (dist > 16) {
      if (!hasMoved) {
        setHasMoved(true);
        setBubbleState('dragging');
      }

      const maxX = window.innerWidth - 56;
      const maxY = window.innerHeight - 66;

      const newX = Math.max(0, Math.min(maxX, dragStartRef.current.posX + dx));
      const newY = Math.max(50, Math.min(maxY, dragStartRef.current.posY + dy));

      setPosition({ x: newX, y: newY });
      setTargetReticlePos({ x: clientX, y: clientY });
    }
  };

  const handleEndDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setIsDragging(false);
    setTargetReticlePos(null);

    if (hasMoved) {
      // Released over target text -> extract and translate
      handleDropTranslation(clientX, clientY);
    } else {
      // Clean tap -> pull out bubble and open quick actions modal
      setBubbleState('docked');
      startIdleTimer();
      onOpenControls();
    }
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleStartDrag(t.clientX, t.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleMoveDrag(t.clientX, t.clientY);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    handleEndDrag(t.clientX, t.clientY);
  };

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    handleStartDrag(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      handleMoveDrag(ev.clientX, ev.clientY);
    };

    const onMouseUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handleEndDrag(ev.clientX, ev.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSpeak = (text: string) => {
    androidBridge.speak(text, settings.preferredTargetLanguage, settings.speechSpeed);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getResultCardStyle = () => {
    if (!activeResult) return {};
    const cardWidth = Math.min(340, window.innerWidth - 32);
    const isRightHalf = activeResult.dropX > window.innerWidth / 2;
    const isBottomHalf = activeResult.dropY > window.innerHeight / 2;

    const left = isRightHalf
      ? Math.max(16, activeResult.dropX - cardWidth + 20)
      : Math.min(window.innerWidth - cardWidth - 16, activeResult.dropX - 20);

    const top = isBottomHalf
      ? Math.max(60, activeResult.dropY - 180)
      : Math.min(window.innerHeight - 220, activeResult.dropY + 40);

    return {
      left: `${left}px`,
      top: `${top}px`,
      maxWidth: `${cardWidth}px`,
    };
  };

  const isSemiHidden = bubbleState === 'semi_hidden' && !isDragging;

  return (
    <div id="fhm-floating-translator-root" className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* 1. Minimalist Target Aiming Reticle (NO text label beside it while dragging) */}
      {isDragging && hasMoved && targetReticlePos && (
        <div
          style={{
            left: `${targetReticlePos.x}px`,
            top: `${targetReticlePos.y}px`,
          }}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 flex items-center justify-center animate-fade-in"
        >
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/90 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="w-7 h-7 rounded-full border border-sky-300 bg-sky-500/15 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Target className="w-3.5 h-3.5 text-sky-300" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Hi Translate Reference Edge Handle & Floating Button */}
      {isSemiHidden ? (
        /* Semi-transparent rounded edge handle (Hi Translate style ergonomic handle) */
        <div
          id="fhm-floating-edge-handle"
          style={{
            top: `${position.y}px`,
            [dockSide === 'left' ? 'left' : 'right']: '0px',
            touchAction: 'none',
          }}
          className={`fixed pointer-events-auto z-50 cursor-grab active:cursor-grabbing transition-transform active:scale-95 flex items-center ${
            dockSide === 'left' ? 'pl-0 pr-1' : 'pr-0 pl-1'
          }`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onClick={() => {
            if (!hasMoved) {
              setBubbleState('docked');
              startIdleTimer();
              onOpenControls();
            }
          }}
          title="টান দিন বা চাপুন: FHM Screen Translator"
        >
          <div
            className={`w-7 sm:w-6 h-18 bg-gradient-to-b from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white backdrop-blur-md border border-sky-300/80 shadow-2xl shadow-blue-900/80 flex flex-col items-center justify-center space-y-1.5 transition-all ${
              dockSide === 'left'
                ? 'rounded-r-2xl border-l-0 shadow-[4px_0_16px_rgba(37,99,235,0.6)]'
                : 'rounded-l-2xl border-r-0 shadow-[-4px_0_16px_rgba(37,99,235,0.6)]'
            }`}
          >
            {/* Subtle inner grip bars and indicator */}
            <div className="w-1.5 h-3.5 rounded-full bg-white/90 shadow-sm" />
            <div className="w-1.5 h-3.5 rounded-full bg-sky-200/80 shadow-sm" />
          </div>
        </div>
      ) : (
        /* Full circular FHM button (When pulled out or active) */
        <div
          id="fhm-floating-bubble-main"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none',
          }}
          className={`fixed pointer-events-auto z-50 cursor-grab active:cursor-grabbing select-none ${
            isDragging ? 'scale-110 shadow-2xl' : 'transition-transform hover:scale-105'
          }`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          <div className="relative flex items-center justify-center">
            {/* Subtle Glow */}
            <div className="absolute -inset-1 rounded-full bg-blue-500/30 blur-sm" />

            {/* Circular FHM Bubble - NO text label beside it */}
            <div className="relative w-13 h-13 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 border-2 border-white/95 shadow-xl shadow-blue-950/80 flex flex-col items-center justify-center text-white">
              {bubbleState === 'translating' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-display font-black text-[11px] tracking-wider leading-none drop-shadow">
                    FHM
                  </span>
                  <span className="text-[8px] font-semibold text-sky-200 leading-none mt-0.5">
                    {targetLang.flag}
                  </span>
                </>
              )}
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Temporary Non-Blocking Translation Result Card */}
      {activeResult && (
        <div
          id="fhm-floating-result-card"
          style={getResultCardStyle()}
          className="fixed pointer-events-auto z-50 bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-2xl shadow-2xl shadow-black/80 p-3.5 text-slate-100 flex flex-col space-y-2 animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <div className="p-1 rounded-md bg-blue-600 text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-sky-300">
                FHM Translation ({targetLang.flag} {targetLang.name})
              </span>
            </div>
            <button
              onClick={() => setActiveResult(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-white leading-snug break-words">
              {activeResult.translatedText}
            </p>
            {activeResult.originalText && (
              <p className="text-[11px] text-slate-400 italic line-clamp-2 border-t border-slate-800/80 pt-1">
                "{activeResult.originalText}"
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleSpeak(activeResult.translatedText)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 font-semibold transition-colors"
                title="Listen Pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Listen</span>
              </button>

              <button
                onClick={() => handleCopy(activeResult.translatedText)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 font-semibold transition-colors"
                title="Copy Translation"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setActiveResult(null);
                onOpenControls();
              }}
              className="px-2 py-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
            >
              More
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
