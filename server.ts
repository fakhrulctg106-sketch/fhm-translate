import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { translateText, ocrAndTranslateImage } from './server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing with increased limit for OCR image base64 data
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'FHM Translate',
      developer: 'Fakhrul Islam',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: Date.now(),
    });
  });

  // Main Text Translation endpoint
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, sourceLang = 'auto', targetLang = 'en' } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text to translate is required' });
      }

      const result = await translateText(text.trim(), sourceLang, targetLang);
      return res.json(result);
    } catch (error: any) {
      console.error('Translation error in /api/translate:', error);
      return res.status(500).json({
        error: error.message || 'Translation failed on the server',
      });
    }
  });

  // OCR and Screen Translation endpoint
  app.post('/api/ocr-translate', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', targetLang = 'en', sourceLang = 'auto' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const result = await ocrAndTranslateImage(imageBase64, mimeType, targetLang, sourceLang);
      return res.json(result);
    } catch (error: any) {
      console.error('OCR Translation error in /api/ocr-translate:', error);
      return res.status(500).json({
        error: error.message || 'OCR Image translation failed on the server',
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FHM Translate Server running on http://localhost:${PORT}`);
  });
}

startServer();
