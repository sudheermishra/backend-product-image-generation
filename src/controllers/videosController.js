const videoGenService = require('../services/videoGenService');

async function generateVideo(req, res) {
  const prompt = req.body.prompt;
  const file = req.file;

  console.log('[videos] POST /generate', prompt ? prompt.slice(0, 40) + '...' : '-', file ? `${(file.size / 1024).toFixed(0)}KB` : 'no file');

  try {
    if (!prompt?.trim()) {
      console.log('[videos] 400 prompt required');
      return res.status(400).json({ error: 'prompt is required' });
    }
    if (!file) {
      console.log('[videos] 400 image required');
      return res.status(400).json({ error: 'image is required' });
    }

    const imageBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    console.log('[videos] generate');
    const video = await videoGenService.generateVideo(prompt, imageBase64, mimeType);
    const sizeKb = ((video.data.length * 3) / 4 / 1024).toFixed(0);
    console.log('[videos] 200', sizeKb + 'KB');

    res.setHeader('Content-Type', video.mimeType);
    res.send(Buffer.from(video.data, 'base64'));
  } catch (err) {
    const message = err.message || 'Video generation failed';
    console.log('[videos] error', message);
    const status =
      message.includes('must be set') ? 400
        : err.response?.status === 404 ? 400
        : 502;
    res.status(status).json({ error: message });
  }
}

module.exports = { generateVideo };
