const axios = require('axios');
const config = require('../config');

function generateImage(prompt) {
  const url = config.imageGenApiUrl;
  const token = config.imageGenApiToken;
  if (!url || !token) {
    throw new Error('IMAGE_GEN_API_URL and IMAGE_GEN_API_TOKEN must be set');
  }
  return axios
    .post(
      url,
      { prompt },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 120000,
        validateStatus: (status) => status === 200,
      }
    )
    .then((res) => {
      const buffer = Buffer.from(res.data);
      console.log('[image] ok', (buffer.length / 1024).toFixed(0) + 'KB');
      return {
        mimeType: 'image/png',
        data: buffer.toString('base64'),
      };
    })
    .catch((err) => {
      const msg = err.response?.data
        ? Buffer.isBuffer(err.response.data)
          ? err.response.data.toString('utf8').slice(0, 200)
          : String(err.response.data).slice(0, 200)
        : err.message;
      console.log('[image] error', err.response?.status || '', msg.slice(0, 80));
      throw new Error(err.response?.status === 429 ? 'Image API rate limit. Try again later.' : msg || 'Image generation failed');
    });
}

module.exports = { generateImage };
