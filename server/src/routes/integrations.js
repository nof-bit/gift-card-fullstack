import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload-file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ file_url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/generate-image', requireAuth, async (req, res) => {
  // Mock image generation
  res.json({ url: '/placeholder-image.jpg' });
});

router.post('/extract-data', requireAuth, async (req, res) => {
  try {
    const { file_url, json_schema } = req.body;
    
    // Mock data extraction - in a real app, you'd use OCR or other extraction methods
    const mockData = {
      stores: ["Amazon", "Target", "Walmart", "Best Buy", "Starbucks", "McDonald's"],
      categories: ["Retail", "Food & Dining", "Entertainment", "Travel", "Gaming"]
    };
    
    res.json({ json: mockData });
  } catch (error) {
    console.error('Extract data error:', error);
    res.status(500).json({ error: 'Data extraction failed' });
  }
});

router.post('/invoke-llm', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Mock LLM response - in a real app, you'd call an actual LLM service
    const mockResponse = `AI Response: ${prompt || 'No prompt provided'}`;
    
    res.json({ text: mockResponse });
  } catch (error) {
    console.error('LLM error:', error);
    res.status(500).json({ error: 'LLM invocation failed' });
  }
});

router.post('/create-signed-url', requireAuth, async (req, res) => {
  // Mock signed URL creation
  res.json({ url: '/signed-url-placeholder' });
});

router.post('/upload-private-file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ ok: true, file_url: `/private/${req.file.filename}` });
  } catch (error) {
    console.error('Private upload error:', error);
    res.status(500).json({ error: 'Private upload failed' });
  }
});

export default router;
