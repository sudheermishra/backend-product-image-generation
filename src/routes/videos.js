const express = require('express');
const { upload } = require('../middleware/upload');
const { generateVideo } = require('../controllers/videosController');

const router = express.Router();

router.post('/generate', upload.single('image'), generateVideo);

module.exports = router;
