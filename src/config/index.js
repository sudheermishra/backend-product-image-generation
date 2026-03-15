require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  scraperApiKey: process.env.SCRAPER_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  imageGenApiUrl:
    process.env.IMAGE_GEN_API_URL ||
    "https://free-image-generation-api.vikasharma-dev.workers.dev",
  imageGenApiToken: process.env.IMAGE_GEN_API_TOKEN,
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
