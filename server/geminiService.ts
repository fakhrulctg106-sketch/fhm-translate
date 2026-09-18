import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment. Fallback mock translator will be used.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang?: string;
  detectedLangName?: string;
  phonetic?: string;
  alternativeTranslations?: string[];
}

export interface OCRTranslateResponse {
  fullOriginalText: string;
  fullTranslatedText: string;
  detectedLanguage?: string;
  blocks: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    translation: string;
  }>;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResponse> {
  const ai = getGenAI();

  if (!ai) {
    // Graceful offline/local simulated translation if no key is present
    return {
      originalText: text,
      translatedText: `[${targetLang.toUpperCase()}] ${text}`,
      sourceLang: sourceLang === 'auto' ? 'en' : sourceLang,
      targetLang,
      detectedLang: sourceLang === 'auto' ? 'en' : sourceLang,
      detectedLangName: 'English (Simulated)',
      phonetic: '',
      alternativeTranslations: [],
    };
  }

  const prompt = `You are the core translation engine for FHM Translate, a universal, production-ready translator.
Translate the following text accurately, naturally, and contextually.

Source Language: ${sourceLang === 'auto' ? 'Auto-Detect' : sourceLang}
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
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING, description: 'The translated text' },
            detectedLang: { type: Type.STRING, description: 'ISO code of detected language' },
            detectedLangName: { type: Type.STRING, description: 'Full name of detected language' },
            phonetic: { type: Type.STRING, description: 'Phonetic or transliteration' },
            alternativeTranslations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Alternative phrasing or synonyms',
            },
          },
          required: ['translatedText', 'detectedLang', 'detectedLangName'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      originalText: text,
      translatedText: parsed.translatedText || text,
      sourceLang: sourceLang === 'auto' ? parsed.detectedLang || 'auto' : sourceLang,
      targetLang,
      detectedLang: parsed.detectedLang || (sourceLang === 'auto' ? 'en' : sourceLang),
      detectedLangName: parsed.detectedLangName || 'Detected',
      phonetic: parsed.phonetic || '',
      alternativeTranslations: parsed.alternativeTranslations || [],
    };
  } catch (error: any) {
    console.error('Gemini translate error:', error);
    throw new Error(error.message || 'Translation failed');
  }
}

export async function ocrAndTranslateImage(
  imageBase64: string,
  mimeType: string,
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<OCRTranslateResponse> {
  const ai = getGenAI();

  if (!ai) {
    return {
      fullOriginalText: 'Simulated OCR text detected from image',
      fullTranslatedText: `[${targetLang.toUpperCase()}] Simulated OCR text detected from image`,
      detectedLanguage: 'en',
      blocks: [
        {
          x: 10,
          y: 15,
          width: 80,
          height: 30,
          text: 'Sample Detected Text',
          translation: `Sample Translated Text (${targetLang})`,
        },
      ],
    };
  }

  // Clean base64 string if it contains data URI header
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

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
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullOriginalText: { type: Type.STRING },
            fullTranslatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  translation: { type: Type.STRING },
                },
                required: ['x', 'y', 'width', 'height', 'text', 'translation'],
              },
            },
          },
          required: ['fullOriginalText', 'fullTranslatedText', 'blocks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      fullOriginalText: parsed.fullOriginalText || '',
      fullTranslatedText: parsed.fullTranslatedText || '',
      detectedLanguage: parsed.detectedLanguage || 'auto',
      blocks: parsed.blocks || [],
    };
  } catch (error: any) {
    console.error('Gemini OCR translate error:', error);
    throw new Error(error.message || 'OCR and translation failed');
  }
}
