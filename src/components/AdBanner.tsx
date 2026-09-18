import React from 'react';
import { Sparkles } from 'lucide-react';
import { adManager } from '../services/adManager';

export const AdBanner: React.FC = () => {
  if (!adManager.isEnabled()) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-2">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Ad
          </span>
          <span className="truncate text-[11px] text-slate-300">
            FHM Translate PRO • Unlimited screen OCR & Voice Translation
          </span>
        </div>
        <button
          onClick={() => adManager.showRewardedAd(() => alert('PRO features unlocked for this session!'))}
          className="text-xs text-sky-400 hover:text-sky-300 font-semibold shrink-0 ml-2"
        >
          Free Pass
        </button>
      </div>
    </div>
  );
};
