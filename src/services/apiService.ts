/**
 * FHM Translate - API Service
 * Developer: Fakhrul Islam
 */

export interface TranslationApiResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang?: string;
  detectedLangName?: string;
  phonetic?: string;
  alternativeTranslations?: string[];
}

export interface OCRApiResult {
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

export async function requestTranslation(
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'en'
): Promise<TranslationApiResult> {
  if (!text.trim()) {
    throw new Error('Please enter or speak text to translate.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Translation request failed (HTTP ${response.status})`);
    }

    const data: TranslationApiResult = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Translation timed out. Please check your internet connection.');
    }
    throw new Error(error.message || 'Unable to connect to translation service. Please check your network.');
  }
}

export async function requestOCRTranslation(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  targetLang: string = 'en',
  sourceLang: string = 'auto'
): Promise<OCRApiResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const response = await fetch('/api/ocr-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        targetLang,
        sourceLang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `OCR translation failed (HTTP ${response.status})`);
    }

    const data: OCRApiResult = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Image OCR processing timed out.');
    }
    throw new Error(error.message || 'Failed to extract and translate text from image.');
  }
}
