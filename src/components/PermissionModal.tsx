import React, { useState } from 'react';
import { Shield, Layers, Camera, Mic, Bell, X, Check, HelpCircle, ExternalLink, Sparkles } from 'lucide-react';
import { PermissionType } from '../types/translation';
import { androidBridge } from '../services/androidBridge';

interface PermissionModalProps {
  isOpen: boolean;
  permissionType: PermissionType;
  onGrant: () => void;
  onDeny: () => void;
  onGrantInAppOnly?: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  permissionType,
  onGrant,
  onDeny,
  onGrantInAppOnly,
}) => {
  const [showAndroid13Guide, setShowAndroid13Guide] = useState(permissionType === 'overlay');

  if (!isOpen) return null;

  const permissionDetails: Record<
    PermissionType,
    { title: string; icon: any; description: string; whyNeeded: string }
  > = {
    overlay: {
      title: 'Display Over Other Apps (স্ক্রিনের উপরে বাবল)',
      icon: Layers,
      description: 'ফেসবুক, মেসেঞ্জার, হোয়াটসঅ্যাপ বা যেকোনো অ্যাপে টেক্সট টান দিয়ে তাৎক্ষণিক অনুবাদ করতে এই পারমিশনটি প্রয়োজন।',
      whyNeeded: 'This lets you drag the circular 🔵 FHM Translate button over any message or screen to translate instantly.',
    },
    camera: {
      title: 'Camera Access (ক্যামেরা দিয়ে অনুবাদ)',
      icon: Camera,
      description: 'বই, সাইনবোর্ড বা ছবির যেকোনো টেক্সট ক্যামেরা দিয়ে সরাসরি অনুবাদ করতে ক্যামেরা অ্যাক্সেস প্রয়োজন।',
      whyNeeded: 'Used only when you open Camera Translate to photograph and translate text.',
    },
    microphone: {
      title: 'Microphone Access (ভয়েস অনুবাদ)',
      icon: Mic,
      description: 'মুখে কথা বলে সরাসরি অনুবাদ এবং কথোপকথন করতে মাইক্রোফোন অ্যাক্সেস প্রয়োজন।',
      whyNeeded: 'Used only when you speak into the microphone during Voice Translation.',
    },
    notification: {
      title: 'Notifications Permission',
      icon: Bell,
      description: 'ব্যাকগ্রাউন্ডে ফ্লোটিং বাবল সচল রাখতে নোটিফিকেশন পারমিশন প্রয়োজন।',
      whyNeeded: 'Required by Android to maintain background service reliability.',
    },
    screenCapture: {
      title: 'Screen Translation Access (স্ক্রিন স্ক্যান)',
      icon: Layers,
      description: 'স্ক্রিনে থাকা যেকোনো লেখার ওপরে বাবল ছেড়ে দিলে এক ক্লিকে অনুবাদ করার অনুমতি।',
      whyNeeded: 'Used only when you trigger screen translation on foreign text.',
    },
  };

  const current = permissionDetails[permissionType] || permissionDetails.overlay;
  const IconComp = current.icon;

  const handleOpenAppDetails = () => {
    androidBridge.openAppDetailsSettings();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-scale-up my-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto shadow-inner">
          <IconComp className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-base text-white">{current.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>
        </div>

        {/* Android 13/14 Restricted Settings Resolution Guide (Specifically for overlay) */}
        {permissionType === 'overlay' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>স্ক্রিনে 'App was denied access' বা শুধু Close দেখাচ্ছে?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Android 13/14-এ নতুন ইনস্টল করা অ্যাপের জন্য গুগল স্বয়ংক্রিয়ভাবে এটি লক করে রাখে। এটি মাত্র ৩টি ধাপে আনলক করুন:
            </p>
            <ol className="text-[11px] text-slate-200 space-y-1.5 pl-4 list-decimal marker:text-amber-400">
              <li>
                নিচের <strong>"Open App Info (অ্যাপ ইনফো খুলুন)"</strong> বাটনে চাপ দিন।
              </li>
              <li>
                অ্যাপ ইনফো পেজের উপরে ডানদিকের <strong>৩টি ডট (⋮)</strong> মেনুতে চাপ দিন।
              </li>
              <li>
                <strong>"Allow restricted settings"</strong> (সীমাবদ্ধ সেটিংস অনুমোদন) বেছে নিয়ে আপনার ফোনের লক/পিন দিন।
              </li>
              <li>
                এরপর <strong>"Display over other apps"</strong> এ ফিরে এসে সুইচটি অন করে দিন!
              </li>
            </ol>

            <button
              onClick={handleOpenAppDetails}
              className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open App Info (৩টি ডট আনলক করতে অ্যাপ ইনফো খুলুন)</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onGrant}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>সরাসরি পারমিশন পেজ খুলুন (Grant Permission)</span>
          </button>

          {permissionType === 'overlay' && (
            <button
              onClick={() => {
                if (onGrantInAppOnly) {
                  onGrantInAppOnly();
                } else {
                  onGrant();
                }
              }}
              className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>অ্যাপের ভেতরে বাবল চালু করুন (ইন-অ্যাপ ফ্লোটিং মোড)</span>
            </button>
          )}

          <button
            onClick={onDeny}
            className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors"
          >
            এখন নয় (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

