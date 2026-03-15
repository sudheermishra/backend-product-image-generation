const scraperService = require('../services/scraperService');
const llmService = require('../services/llmService');
const imageGenService = require('../services/imageGenService');

async function generateProductImage(req, res) {
  const productUrl = req.body.productUrl;
  const file = req.file;

  console.log('[images] POST /generate', productUrl ? `${productUrl.slice(0, 50)}...` : '-', file ? `${(file.size / 1024).toFixed(0)}KB` : 'no file');

  try {
    if (!productUrl?.trim()) {
      console.log('[images] 400 productUrl required');
      return res.status(400).json({ error: 'productUrl is required' });
    }
    try {
      new URL(productUrl);
    } catch {
      console.log('[images] 400 invalid URL');
      return res.status(400).json({ error: 'productUrl must be a valid URL' });
    }
    if (!file) {
      console.log('[images] 400 sampleImage required');
      return res.status(400).json({ error: 'sampleImage is required' });
    }

    const sampleBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    console.log('[images] scrape');
    const scrapedHtml = await scraperService.scrapeProductPage(productUrl);

    console.log('[images] description');
    const productDescription = await llmService.getProductDescription(scrapedHtml);

    console.log('[images] prompt');
    const imagePrompt = await llmService.getImagePromptFromSample(
      sampleBase64,
      productDescription,
      mimeType
    );

    console.log('[images] image');
    const image = await imageGenService.generateImage(imagePrompt);
    const sizeKb = ((image.data.length * 3) / 4 / 1024).toFixed(0);
    console.log('[images] 200', sizeKb + 'KB');

    res.setHeader('Content-Type', image.mimeType);
    res.send(Buffer.from(image.data, 'base64'));
  } catch (err) {
    const message = err.message || 'Image generation failed';
    const step = !err.message?.includes('Scraping') && !err.message?.includes('Scraper')
      ? (err.message?.includes('GEMINI') ? 'llm' : err.message?.includes('IMAGE_GEN') || err.message?.includes('Image API') ? 'image' : '')
      : 'scrape';
    console.log('[images] error', step ? `(${step}) ` : '', message);
    const status =
      err.response?.status === 404 || message.includes('not configured')
        ? 400
        : 502;
    res.status(status).json({ error: message });
  }
}

module.exports = { generateProductImage };
