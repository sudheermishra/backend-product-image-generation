const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const imagesRouter = require('./routes/images');
const videosRouter = require('./routes/videos');

const app = express();

const corsOptions = {
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((o) => o.trim()),
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/', routes);
app.use('/api/images', imagesRouter);
app.use('/api/videos', videosRouter);

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 10MB)' });
  }
  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message === 'Unexpected field') {
    const isVideo = req.originalUrl?.includes('/videos');
    return res.status(400).json({
      error: isVideo
        ? 'Use form fields: prompt (text) and image (file).'
        : 'Use form fields: productUrl (text) and sampleImage (file). For video generation use POST /api/videos/generate.',
    });
  }
  res.status(500).json({ error: err.message || 'Server error' });
});

module.exports = app;
