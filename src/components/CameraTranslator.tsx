import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Share2,
  X,
  RefreshCw,
  Eye,
  SwitchCamera,
  Layers,
} from 'lucide-react';
import { Language, UserSettings, OCRResult } from '../types/translation';
import { requestOCRTranslation } from '../services/apiService';
import { androidBridge } from '../services/androidBridge';
import { saveHistoryItem } from '../services/storageService';

interface CameraTranslatorProps {
  settings: UserSettings;
  sourceLang: Language;
  targetLang: Language;
  onRequestCameraPermission: () => Promise<boolean>;
  onClose: () => void;
}

export const CameraTranslator: React.FC<CameraTranslatorProps> = ({
  settings,
  sourceLang,
  targetLang,
  onRequestCameraPermission,
  onClose,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initCamera();
    return () => {
      stopCameraStream();
    };
  }, [facingMode]);

  const initCamera = async () => {
    stopCameraStream();
    setErrorMsg(null);

    const granted = await onRequestCameraPermission();
    if (!granted) {
      setHasPermission(false);
      return;
    }
    setHasPermission(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      // Fallback: camera hardware unavailable or blocked
      setErrorMsg('Camera access is not available or blocked in this browser context.');
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImage(base64Image);
    stopCameraStream();

    // Process OCR
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await requestOCRTranslation(
        base64Image,
        'image/jpeg',
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
          mode: 'camera',
        });
      }
    } catch (err: any) {
      console.error('Camera OCR failed:', err);
      setErrorMsg(err.message || 'Could not extract and translate text from captured image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setErrorMsg(null);
    initCamera();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (text: string) => {
    androidBridge.speak(text, targetLang.code, settings.speechSpeed);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Camera Translate</h3>
            <p className="text-[11px] text-slate-400">
              {sourceLang.name} → {targetLang.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!capturedImage && (
            <button
              onClick={() =>
                setFacingMode(facingMode === 'environment' ? 'user' : 'environment')
              }
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {capturedImage && (
            <button
              onClick={handleRetake}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewfinder / Snapshot Box */}
      <div className="relative bg-black rounded-3xl overflow-hidden border border-slate-800 min-h-[360px] max-h-[500px] flex items-center justify-center shadow-2xl">
        {/* Live Camera View */}
        {!capturedImage && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Scanning Crosshairs */}
            <div className="absolute inset-8 border-2 border-dashed border-blue-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between text-blue-400 text-xs font-mono">
                <span>[SCAN]</span>
                <span>{targetLang.code.toUpperCase()}</span>
              </div>
              <div className="text-center text-xs text-white/80 bg-black/50 py-1 px-3 rounded-full backdrop-blur-sm self-center">
                Point camera at foreign text and tap capture
              </div>
            </div>

            {/* Shutter Capture Button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                id="btn-camera-capture"
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-2xl transform active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600" />
              </button>
            </div>
          </>
        )}

        {/* Captured Image Preview + OCR Layer */}
        {capturedImage && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain max-h-[480px]"
            />

            {/* Processing Spinner */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-xs font-bold">Scanning image & translating...</p>
              </div>
            )}

            {/* Bounding Box Highlights */}
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
                    <div className="bg-blue-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg border border-white/60 backdrop-blur-sm">
                      {block.translation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-rose-950/90 border border-rose-500/80 rounded-xl text-xs text-rose-200 text-center">
            {errorMsg}
          </div>
        )}
      </div>

      {/* OCR Result Card */}
      {ocrResult && !isProcessing && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-xs font-bold text-blue-400">
              Translated Text ({targetLang.name})
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

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Detected original: </span>
            <span className="italic">{ocrResult.fullOriginalText}</span>
          </div>
        </div>
      )}

      {/* Hidden canvas for snapshot rasterization */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
