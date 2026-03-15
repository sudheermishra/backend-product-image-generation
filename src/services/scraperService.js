const axios = require('axios');
const config = require('../config');

const SCRAPER_API_BASE = 'https://api.scraperapi.com';

async function scrapeProductPage(productUrl) {
  if (!config.scraperApiKey) {
    throw new Error('SCRAPER_API_KEY is not configured');
  }
  const url = `${SCRAPER_API_BASE}?api_key=${config.scraperApiKey}&url=${encodeURIComponent(productUrl)}`;
  try {
    const { data } = await axios.get(url, {
      timeout: 60000,
      responseType: 'text',
      validateStatus: (status) => status === 200,
    });
    const result = typeof data === 'string' ? data : JSON.stringify(data);
    console.log('[scraper] ok', (result.length / 1000).toFixed(1) + 'k chars');
    return result;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    const snippet = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body || {}).slice(0, 200);
    console.log('[scraper] error', status || err.code, snippet);
    if (status === 500) {
      throw new Error('Scraping failed: service error (500). Some sites block scrapers—try a different product URL.');
    }
    if (status === 429) {
      throw new Error('Scraper rate limit exceeded. Try again in a few minutes.');
    }
    throw err;
  }
}

module.exports = { scrapeProductPage };
