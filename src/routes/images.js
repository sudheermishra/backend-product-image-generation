const express = require('express');
const { upload } = require('../middleware/upload');
const { generateProductImage } = require('../controllers/imagesController');

const router = express.Router();

router.post('/generate', upload.single('sampleImage'), generateProductImage);

module.exports = router;
