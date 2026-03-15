const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

// Veo 3.1 via Gemini API (paid preview). If 404, try veo-2.0-generate-001
const VEO_MODEL = 'veo-3.1-generate-preview';
const POLL_INTERVAL_MS = 10000;
const MAX_WAIT_MS = 300000; // 5 min

function getClient() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVideoBytes(videoObj) {
  if (videoObj.videoBytes) {
    return { mimeType: videoObj.mimeType || 'video/mp4', data: videoObj.videoBytes };
  }
  if (videoObj.uri && (videoObj.uri.startsWith('http://') || videoObj.uri.startsWith('https://'))) {
    const { data } = await axios.get(videoObj.uri, { responseType: 'arraybuffer', timeout: 120000 });
    return {
      mimeType: videoObj.mimeType || 'video/mp4',
      data: Buffer.from(data).toString('base64'),
    };
  }
  throw new Error('Video has no videoBytes or downloadable uri');
}

async function generateVideo(prompt, imageBase64, imageMimeType = 'image/jpeg') {
  const ai = getClient();
  console.log('[video] start Veo 3', prompt.slice(0, 40) + '...');

  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: imageMimeType || 'image/jpeg',
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: '16:9',
        durationSeconds: 6,
      },
    });
  } catch (err) {
    const msg = err.message || String(err);
    console.log('[video] error', msg.slice(0, 120));
    throw err;
  }

  const start = Date.now();
  while (!operation.done && Date.now() - start < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS);
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (!operation.done) {
    console.log('[video] error timeout');
    throw new Error('Video generation timed out');
  }
  if (operation.error) {
    const msg = operation.error.message || JSON.stringify(operation.error);
    console.log('[video] error', msg.slice(0, 100));
    throw new Error(msg);
  }

  const first = operation.response?.generatedVideos?.[0]?.video;
  if (!first) {
    console.log('[video] error no video in response');
    throw new Error('No video in response');
  }

  const result = await getVideoBytes(first);
  console.log('[video] ok', ((result.data.length * 3) / 4 / 1024).toFixed(0) + 'KB');
  return result;
}

module.exports = { generateVideo };
