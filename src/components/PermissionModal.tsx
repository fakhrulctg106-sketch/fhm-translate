import React from 'react';
import { Shield, Layers, Camera, Mic, Bell, X, Check } from 'lucide-react';
import { PermissionType } from '../types/translation';

interface PermissionModalProps {
  isOpen: boolean;
  permissionType: PermissionType;
  onGrant: () => void;
  onDeny: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  permissionType,
  onGrant,
  onDeny,
}) => {
  if (!isOpen) return null;

  const permissionDetails: Record<
    PermissionType,
    { title: string; icon: any; description: string; whyNeeded: string }
  > = {
    overlay: {
      title: 'Display Over Other Apps',
      icon: Layers,
      description: 'Allow FHM Translate to display the floating 🔵 bubble while using other apps.',
      whyNeeded: 'This lets you translate text in chat apps, social feeds, and web browsers with one tap.',
    },
    camera: {
      title: 'Camera Access',
      icon: Camera,
      description: 'Allow FHM Translate to use your camera for real-time text scanning.',
      whyNeeded: 'Used only when you open Camera Translate to photograph text, menus, or signs.',
    },
    microphone: {
      title: 'Microphone Access',
      icon: Mic,
      description: 'Allow FHM Translate to record your voice for speech translation.',
      whyNeeded: 'Used only when you speak into the microphone during Voice Translation.',
    },
    notification: {
      title: 'Notifications Permission',
      icon: Bell,
      description: 'Keep the translation service active in the background when floating bubble is on.',
      whyNeeded: 'Required by Android to maintain seamless background overlay functionality.',
    },
    screenCapture: {
      title: 'Screen Translation Access',
      icon: Layers,
      description: 'Allow FHM Translate to capture and scan on-screen foreign text.',
      whyNeeded: 'Used exclusively when you tap "Translate Screen" to translate visible text on your screen.',
    },
  };

  const current = permissionDetails[permissionType] || permissionDetails.overlay;
  const IconComp = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-scale-up">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto">
          <IconComp className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-base text-white">{current.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs text-slate-400">
          <span className="font-semibold text-slate-300 block mb-1">Why is this required?</span>
          <span>{current.whyNeeded}</span>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={onDeny}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={onGrant}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
          >
            Allow Permission
          </button>
        </div>
      </div>
    </div>
  );
};
