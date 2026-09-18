import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  Layers,
  FileText,
} from 'lucide-react';
import { Language, UserSettings, OCRResult } from '../types/translation';
import { requestOCRTranslation } from '../services/apiService';
import { androidBridge } from '../services/androidBridge';
import { saveHistoryItem } from '../services/storageService';

interface ImageTranslatorProps {
  settings: UserSettings;
  sourceLang: Language;
  targetLang: Language;
}

export const ImageTranslator: React.FC<ImageTranslatorProps> = ({
  settings,
  sourceLang,
  targetLang,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setOcrResult(null);
      setErrorMsg(null);
      await performOCR(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const performOCR = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await requestOCRTranslation(
        base64,
        mimeType,
        targetLang.code,
        sourceLang.code
      );

      setOcrResult(result);

      if (result.fullOriginalText && result.fullTranslatedText) {
        saveHistoryItem({
          originalText: result.fullOriginalText,
          translatedText: result.fullTranslatedText,
          sourceLang: result.detectedLanguage || sourceLang.code,
          targetLang: targetLang.code,
          mode: 'image',
        });
      }
    } catch (err: any) {
      console.error('Image OCR translation error:', err);
      setErrorMsg(err.message || 'Failed to extract and translate text from image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (text: string) => {
    androidBridge.speak(text, targetLang.code, settings.speechSpeed);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setOcrResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Gallery Image Translate</h3>
            <p className="text-[11px] text-slate-400">
              {sourceLang.name} → {targetLang.name} (No camera permission needed)
            </p>
          </div>
        </div>

        {selectedImage && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Choose Another</span>
          </button>
        )}
      </div>

      {/* Image Upload Box */}
      {!selectedImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processImageFile(file);
          }}
          className="bg-slate-900/80 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-800 shadow-lg">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-bold text-sm text-white">Select Image from Device Gallery</h4>
            <p className="text-xs text-slate-400">
              Drag and drop an image here or click to browse files
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
          >
            Browse Gallery
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Image Preview & OCR Stage */}
      {selectedImage && (
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 max-h-[420px] flex items-center justify-center shadow-xl">
          <img
            src={selectedImage}
            alt="To Translate"
            className="w-full h-full object-contain max-h-[400px]"
          />

          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs font-bold">Extracting & translating text...</p>
            </div>
          )}

          {/* OCR Blocks */}
          {ocrResult && !isProcessing && (
            <div className="absolute inset-0 pointer-events-none p-4">
              {ocrResult.blocks.map((block, idx) => (
                <div
                  key={idx}
                  style={{
                    left: `${Math.max(5, Math.min(85, block.x))}%`,
                    top: `${Math.max(10, Math.min(80, block.y))}%`,
                  }}
                  className="absolute pointer-events-auto"
                >
                  <div className="bg-indigo-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg border border-white/60 backdrop-blur-sm">
                    {block.translation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Card */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-500/80 rounded-xl text-xs text-rose-200 text-center">
          {errorMsg}
        </div>
      )}

      {/* OCR Result Card */}
      {ocrResult && !isProcessing && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-xs font-bold text-indigo-400">
              Translated Result ({targetLang.name})
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleSpeak(ocrResult.fullTranslatedText)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopy(ocrResult.fullTranslatedText)}
                className="p-1 text-slate-400 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-sm text-white font-medium whitespace-pre-line leading-relaxed">
            {ocrResult.fullTranslatedText}
          </p>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Detected original: </span>
            <span className="italic">{ocrResult.fullOriginalText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
