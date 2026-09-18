import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  X,
  Languages,
  Target,
  ChevronRight,
  ChevronLeft,
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
  onClose,
}) => {
  // State: 'docked' (full circle at edge) | 'semi_hidden' (tucked ~70% into edge) | 'dragging' | 'translating'
  const [bubbleState, setBubbleState] = useState<'docked' | 'semi_hidden' | 'dragging' | 'translating'>('docked');
  const [dockSide, setDockSide] = useState<'left' | 'right'>(settings.floatingEdgeSide || 'left');

  // Position on screen
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const defaultX = settings.floatingEdgeSide === 'right' ? (typeof window !== 'undefined' ? window.innerWidth - 68 : 320) : 10;
    return settings.floatingBubblePosition || { x: defaultX, y: 180 };
  });

  // Drag tracking
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [targetReticlePos, setTargetReticlePos] = useState<{ x: number; y: number } | null>(null);

  // Active translation result card
  const [activeResult, setActiveResult] = useState<TranslationResultCard | null>(null);
  const [copied, setCopied] = useState(false);

  // Timers & refs
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number }>({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  });

  const targetLang = getLanguageByCode(settings.preferredTargetLanguage);

  // Auto-slide deeper into edge after 3.5 seconds of inactivity
  const startInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setBubbleState('semi_hidden');
    }, 3500);
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Initialize edge docking on mount
  useEffect(() => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const initialSide = position.x > screenWidth / 2 ? 'right' : 'left';
    setDockSide(initialSide);

    if (settings.floatingDockToEdge) {
      const edgeX = initialSide === 'left' ? 10 : screenWidth - 68;
      setPosition((prev) => ({ x: edgeX, y: prev.y }));
    }

    startInactivityTimer();

    return () => {
      clearInactivityTimer();
      if (resultDismissTimerRef.current) clearTimeout(resultDismissTimerRef.current);
    };
  }, []);

  // Extract contextual text at dropped coordinates
  const extractTextAtCoordinates = (clientX: number, clientY: number): string => {
    if (typeof document === 'undefined') return '';

    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      if (el.closest('#fhm-floating-translator-root')) continue;

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

    return 'Questo è un testo di esempio sullo schermo da tradurre in tempo reale.';
  };

  // Perform single drop translation
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

      // Save into translation history
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
      console.error('Drop translation error:', err);
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
      const edgeX = targetSide === 'left' ? 10 : screenWidth - 68;
      const finalY = Math.max(65, Math.min(window.innerHeight - 80, dropY));

      setDockSide(targetSide);
      setPosition({ x: edgeX, y: finalY });
      onUpdatePosition({ x: edgeX, y: finalY }, targetSide);

      // Step 6: Keep the bubble circular while initially docked
      setBubbleState('docked');

      // Step 7: After short period of inactivity, automatically slide deeper toward edge
      startInactivityTimer();
    }
  };

  // Drag Gesture Handlers
  const handleStartDrag = (clientX: number, clientY: number) => {
    clearInactivityTimer();
    setIsDragging(true);
    setHasMoved(false);
    setBubbleState('dragging');

    // If starting from semi-hidden state, adjust starting posX so the bubble expands under cursor
    let startPosX = position.x;
    if (bubbleState === 'semi_hidden') {
      const screenWidth = window.innerWidth;
      startPosX = dockSide === 'left' ? 10 : screenWidth - 68;
      setPosition((prev) => ({ ...prev, x: startPosX }));
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

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      setHasMoved(true);
    }

    const maxX = window.innerWidth - 64;
    const maxY = window.innerHeight - 70;

    const newX = Math.max(4, Math.min(maxX, dragStartRef.current.posX + dx));
    const newY = Math.max(50, Math.min(maxY, dragStartRef.current.posY + dy));

    setPosition({ x: newX, y: newY });
    setTargetReticlePos({ x: clientX, y: clientY });
  };

  const handleEndDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setIsDragging(false);
    setTargetReticlePos(null);

    if (hasMoved) {
      // Step 4: Released over target area -> single OCR translation action
      handleDropTranslation(clientX, clientY);
    } else {
      // Simple tap -> restored circular bubble and open options
      setBubbleState('docked');
      startInactivityTimer();
      onOpenControls();
    }
  };

  // Touch Handlers
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

  // Mouse Handlers
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

  // Determine transform offset when semi-hidden at edge
  const isSemiHidden = bubbleState === 'semi_hidden' && !isDragging;
  const slideTransform = isSemiHidden
    ? dockSide === 'left'
      ? 'translateX(-66%)'
      : 'translateX(66%)'
    : 'translateX(0)';

  return (
    <div id="fhm-floating-translator-root" className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* 1. Target Aiming Reticle (Visible during drag) */}
      {isDragging && hasMoved && targetReticlePos && (
        <div
          style={{
            left: `${targetReticlePos.x}px`,
            top: `${targetReticlePos.y}px`,
          }}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 flex flex-col items-center justify-center animate-fade-in"
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/80 animate-spin" style={{ animationDuration: '8s' }} />
            <div className="w-8 h-8 rounded-full border border-sky-300 bg-sky-500/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Target className="w-4 h-4 text-sky-300" />
            </div>
          </div>
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-sky-500/40 text-[10px] font-bold text-sky-300 shadow-xl whitespace-nowrap">
            Release to translate into {targetLang.name}
          </div>
        </div>
      )}

      {/* 2. Circular FHM Bubble with Edge Sliding (Steps 1, 6, 7, 8, 9, 10, 11) */}
      <div
        id="fhm-floating-bubble-container"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: slideTransform,
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s ease-out',
          touchAction: 'none',
        }}
        className={`fixed pointer-events-auto z-50 cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'scale-110 shadow-2xl' : ''
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        title={isSemiHidden ? 'Pull FHM Translate bubble from edge' : 'Drag over text to translate'}
      >
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Glow */}
          <div
            className={`absolute -inset-1 rounded-full bg-blue-500/30 blur-sm transition-opacity duration-300 ${
              isSemiHidden ? 'opacity-40 hover:opacity-100' : 'opacity-70'
            }`}
          />

          {/* Full Circular FHM Translate Bubble (56px) */}
          <div
            className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 border-2 border-white/95 shadow-2xl shadow-blue-950/80 flex flex-col items-center justify-center text-white transition-all ${
              isSemiHidden
                ? 'opacity-85 hover:opacity-100 ring-2 ring-sky-400/60 ring-offset-1 ring-offset-slate-900'
                : 'hover:scale-105'
            }`}
          >
            {bubbleState === 'translating' ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="font-display font-black text-xs tracking-wider leading-none drop-shadow">
                  FHM
                </span>
                <span className="text-[9px] font-semibold text-sky-200 leading-none mt-0.5">
                  {targetLang.flag}
                </span>
              </>
            )}

            {/* Active Status Indicator Dot */}
            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

            {/* Subtle Edge Gripper Icon when semi-hidden */}
            {isSemiHidden && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 ${
                  dockSide === 'left' ? 'right-1' : 'left-1'
                } text-sky-200 pointer-events-none`}
              >
                {dockSide === 'left' ? (
                  <ChevronRight className="w-3 h-3 animate-pulse" />
                ) : (
                  <ChevronLeft className="w-3 h-3 animate-pulse" />
                )}
              </div>
            )}
          </div>

          {/* Hover Tooltip when docked */}
          {!isDragging && bubbleState === 'docked' && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 hidden md:flex items-center space-x-1.5 bg-slate-900/95 border border-slate-700 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap ${
                dockSide === 'left' ? 'left-full ml-2' : 'right-full mr-2'
              }`}
            >
              <span className="text-sky-300 font-bold">Drag over text</span>
              <span className="text-slate-500">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenControls();
                }}
                className="text-slate-300 hover:text-white underline"
              >
                Options
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Non-Blocking Floating Translation Result Card (Step 4 & 16) */}
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

          {/* Text Content */}
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
