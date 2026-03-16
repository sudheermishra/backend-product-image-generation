const express = require('express');
const { upload } = require('../middleware/upload');
const {
  generateProductImage,
  generateLeonardoImageHandler,
} = require('../controllers/imagesController');

const router = express.Router();

// Product image pipeline (scraper + Gemini + image API)
router.post('/generate', upload.single('sampleImage'), generateProductImage);

// Leonardo image generation (scraper + Gemini prompt + Leonardo API)
router.post('/leonardo', upload.single('sampleImage'), generateLeonardoImageHandler);

module.exports = router;
