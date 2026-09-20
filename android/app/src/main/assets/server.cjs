var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);

// server/geminiService.ts
var import_genai = require("@google/genai");
var aiClient = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment. Fallback mock translator will be used.");
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function translateText(text, sourceLang, targetLang) {
  const ai = getGenAI();
  if (!ai) {
    return {
      originalText: text,
      translatedText: `[${targetLang.toUpperCase()}] ${text}`,
      sourceLang: sourceLang === "auto" ? "en" : sourceLang,
      targetLang,
      detectedLang: sourceLang === "auto" ? "en" : sourceLang,
      detectedLangName: "English (Simulated)",
      phonetic: "",
      alternativeTranslations: []
    };
  }
  const prompt = `You are the core translation engine for FHM Translate, a universal, production-ready translator.
Translate the following text accurately, naturally, and contextually.

Source Language: ${sourceLang === "auto" ? "Auto-Detect" : sourceLang}
Target Language: ${targetLang}

Text to translate:
"""
${text}
"""

Return a JSON object conforming to this specification:
- translatedText: the pristine natural translation in the target language.
- detectedLang: ISO 639-1 code of the detected source language (e.g. "bn", "it", "en", "ar", "es", "zh", etc.).
- detectedLangName: Full English name of the detected source language (e.g. "Bengali", "Italian", "English", "Arabic").
- phonetic: (optional) Romanized/Phonetic pronunciation if helpful (especially for non-Latin scripts like Bengali, Arabic, Hindi, Russian, Japanese, etc.).
- alternativeTranslations: (optional array of strings) 1-3 alternate meanings or synonyms if the text is short or has multiple nuances.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            translatedText: { type: import_genai.Type.STRING, description: "The translated text" },
            detectedLang: { type: import_genai.Type.STRING, description: "ISO code of detected language" },
            detectedLangName: { type: import_genai.Type.STRING, description: "Full name of detected language" },
            phonetic: { type: import_genai.Type.STRING, description: "Phonetic or transliteration" },
            alternativeTranslations: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Alternative phrasing or synonyms"
            }
          },
          required: ["translatedText", "detectedLang", "detectedLangName"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return {
      originalText: text,
      translatedText: parsed.translatedText || text,
      sourceLang: sourceLang === "auto" ? parsed.detectedLang || "auto" : sourceLang,
      targetLang,
      detectedLang: parsed.detectedLang || (sourceLang === "auto" ? "en" : sourceLang),
      detectedLangName: parsed.detectedLangName || "Detected",
      phonetic: parsed.phonetic || "",
      alternativeTranslations: parsed.alternativeTranslations || []
    };
  } catch (error) {
    console.error("Gemini translate error:", error);
    throw new Error(error.message || "Translation failed");
  }
}
async function ocrAndTranslateImage(imageBase64, mimeType, targetLang, sourceLang = "auto") {
  const ai = getGenAI();
  if (!ai) {
    return {
      fullOriginalText: "Simulated OCR text detected from image",
      fullTranslatedText: `[${targetLang.toUpperCase()}] Simulated OCR text detected from image`,
      detectedLanguage: "en",
      blocks: [
        {
          x: 10,
          y: 15,
          width: 80,
          height: 30,
          text: "Sample Detected Text",
          translation: `Sample Translated Text (${targetLang})`
        }
      ]
    };
  }
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const prompt = `You are the OCR and Screen Translation Engine for FHM Translate.
Perform optical character recognition (OCR) on all visible text in this image/screenshot.
Detect the source language and translate all detected text into target language "${targetLang}".
Identify the visual text blocks and approximate bounding box percentages (x: 0-100%, y: 0-100%, width: 0-100%, height: 0-100%).

Return a JSON object conforming to:
- fullOriginalText: The full extracted original text across the image.
- fullTranslatedText: The full translated version into "${targetLang}".
- detectedLanguage: The detected primary source language code (e.g. "bn", "it", "en", "ar", "es", "zh", etc.).
- blocks: array of individual text regions, each containing:
  - x: percentage from left edge (0-100)
  - y: percentage from top edge (0-100)
  - width: percentage width (1-100)
  - height: percentage height (1-100)
  - text: original OCR text for this region
  - translation: translated text for this region in "${targetLang}"`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            fullOriginalText: { type: import_genai.Type.STRING },
            fullTranslatedText: { type: import_genai.Type.STRING },
            detectedLanguage: { type: import_genai.Type.STRING },
            blocks: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  x: { type: import_genai.Type.NUMBER },
                  y: { type: import_genai.Type.NUMBER },
                  width: { type: import_genai.Type.NUMBER },
                  height: { type: import_genai.Type.NUMBER },
                  text: { type: import_genai.Type.STRING },
                  translation: { type: import_genai.Type.STRING }
                },
                required: ["x", "y", "width", "height", "text", "translation"]
              }
            }
          },
          required: ["fullOriginalText", "fullTranslatedText", "blocks"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return {
      fullOriginalText: parsed.fullOriginalText || "",
      fullTranslatedText: parsed.fullTranslatedText || "",
      detectedLanguage: parsed.detectedLanguage || "auto",
      blocks: parsed.blocks || []
    };
  } catch (error) {
    console.error("Gemini OCR translate error:", error);
    throw new Error(error.message || "OCR and translation failed");
  }
}

// server.ts
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      app: "FHM Translate",
      developer: "Fakhrul Islam",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: Date.now()
    });
  });
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLang = "auto", targetLang = "en" } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text to translate is required" });
      }
      const result = await translateText(text.trim(), sourceLang, targetLang);
      return res.json(result);
    } catch (error) {
      console.error("Translation error in /api/translate:", error);
      return res.status(500).json({
        error: error.message || "Translation failed on the server"
      });
    }
  });
  app.post("/api/ocr-translate", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", targetLang = "en", sourceLang = "auto" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }
      const result = await ocrAndTranslateImage(imageBase64, mimeType, targetLang, sourceLang);
      return res.json(result);
    } catch (error) {
      console.error("OCR Translation error in /api/ocr-translate:", error);
      return res.status(500).json({
        error: error.message || "OCR Image translation failed on the server"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FHM Translate Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
