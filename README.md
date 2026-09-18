# 🌐 FHM Translate — Universal AI Translator & Floating Screen Translator

> **Developer: Fakhrul Islam**  
> *A modern, mobile-first, edge-docked universal translation application powered by Gemini AI and Android Native Overlay architecture.*

---

## 📱 Features Overview (মূল বৈশিষ্ট্যসমূহ)

- **🔵 Edge-Docked Floating Screen Translator (Hi Translate UX)**:
  - Persistent, non-intrusive floating button that floats above other apps.
  - Inactivity auto-sliding into the screen edge, showing only a small subtle rounded edge handle (no text labels).
  - Drag the edge handle to pull out the full circular **FHM** button.
  - Drag the circular button over any text and release to trigger instant single-shot OCR & translation.
  - Non-blocking temporary translation result overlay with Text-to-Speech and copy actions.
  - Zero continuous background screen capture — 100% privacy preserving.

- **💬 Real-Time Multi-Language Translation**:
  - Full support for **Bengali (বাংলা), English, Italian (Italiano), Arabic (العربية), Hindi (हिन्दी), Spanish (Español), French (Français), German, Japanese, Chinese, Russian**, and 100+ global languages.
  - Automatic language detection and bidirectional split-chat conversation mode.

- **🎙️ Dual-Speaker Voice & Speech Synthesis (TTS)**:
  - Real-time speech recognition and native voice playback with adjustable speech rate.

- **📷 Visual OCR Camera & Image Translator**:
  - Live camera view or gallery photo upload with interactive bounding boxes and text overlays.

- **📚 Translation History, Saved Favorites & Custom Dictionary**:
  - Offline-first local storage for translation history, bookmarked phrases, and custom vocabulary.

- **📱 Android Native Architecture**:
  - Native Kotlin service implementation (`FloatingTranslatorService.kt`, `ScreenCaptureService.kt`) with `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend / API**: Node.js, Express, Google Gen AI SDK (`@google/genai`)
- **Android Native**: Kotlin, Android WindowManager, MediaProjection API, NotificationCompat
- **Build Tools**: Vite 6, esbuild, tsx

---

## 🚀 Quick Start (লোকাল সেটআপ গাইড)

### 1. Clone the repository (ক্লোন করুন)

```bash
git clone https://github.com/your-username/fhm-translate.git
cd fhm-translate
```

### 2. Install dependencies (প্যাকেজ ইনস্টল করুন)

```bash
npm install
```

### 3. Setup Environment Variables (এনভায়রনমেন্ট ভেরিয়েবল সেটআপ)

Create a `.env` file in the project root:

```env
GEMINI_API_KEY="your_google_gemini_api_key_here"
PORT=3000
```

> Get your API key from [Google AI Studio](https://aistudio.google.com/).

### 4. Run Development Server (ডেভ সার্ভার রান করুন)

```bash
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000).

### 5. Production Build (প্রোডাকশন বিল্ড)

```bash
npm run build
npm start
```

---

## 📁 Project Structure (প্রজেক্টের ফাইল স্ট্রাকচার)

```
fhm-translate/
├── android/                             # Android Native Code
│   └── app/src/main/
│       ├── AndroidManifest.xml          # Permissions & Overlay definitions
│       ├── java/com/fhm/translate/
│       │   ├── MainActivity.kt          # Main Activity & WebView Bridge
│       │   ├── FloatingTranslatorService.kt # Real WindowManager Edge-Docked Overlay
│       │   ├── ScreenCaptureService.kt  # MediaProjection Screen Capture Service
│       │   └── AndroidBridge.kt         # JavaScript Interface Bridge
│       └── res/layout/                  # Android XML layouts
│           ├── layout_floating_bubble.xml
│           └── layout_floating_result_card.xml
├── src/                                 # React Frontend Code
│   ├── components/                      # UI Components
│   │   ├── FloatingBubble.tsx           # Floating Edge Translator Component
│   │   ├── FloatingControlsModal.tsx    # Quick Floating Overlay Settings
│   │   ├── ScreenTranslatorOverlay.tsx  # Full Screen Translation View
│   │   ├── ScreenSimModal.tsx           # Screen Simulator for Testing
│   │   ├── VoiceConversationModal.tsx   # Dual Voice Conversation
│   │   ├── CameraTranslatorModal.tsx    # OCR Camera Translator
│   │   └── SettingsModal.tsx            # App Settings & Permissions
│   ├── data/
│   │   └── languages.ts                 # 100+ Global Languages Database
│   ├── services/
│   │   ├── apiService.ts                # Gemini API Integration
│   │   ├── androidBridge.ts             # Web-to-Android Bridge Handler
│   │   └── storageService.ts            # Local Storage & History Service
│   ├── types/
│   │   └── translation.ts               # TypeScript Interfaces & Types
│   ├── App.tsx                          # Main Application Hub
│   └── main.tsx                         # React Entry Point
├── server.ts                            # Express Backend Server (Gemini API Proxy)
├── package.json                         # NPM Dependencies & Scripts
├── vite.config.ts                       # Vite Configuration
├── metadata.json                        # Applet Metadata & Permissions
├── .env.example                         # Environment Variables Template
├── .gitignore                           # Git Ignore Rules
├── LICENSE                              # MIT License
└── README.md                            # Documentation
```

---

## 🔐 Permissions Model (পারমিশন গাইড)

In accordance with modern Android best practices, **permissions are strictly requested on-demand**:
- **Display over other apps (`SYSTEM_ALERT_WINDOW`)**: Requested only when enabling the Floating Screen Translator.
- **Screen Capture (`MediaProjection`)**: Requested with single-shot user consent when dragging & releasing the bubble over text.
- **Microphone (`RECORD_AUDIO`)**: Requested only when tapping Voice Translation.
- **Camera (`CAMERA`)**: Requested only when opening OCR Camera Translation.

---

## 👨‍💻 Developer & Author

- **Developer**: Fakhrul Islam
- **Email**: fakhrulctg106@gmail.com
- **Project**: FHM Translate (Universal AI Translation System)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
