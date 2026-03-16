const scraperService = require("../services/scraperService");
const llmService = require("../services/llmService");
const imageGenService = require("../services/imageGenService");
const { generateLeonardoImage } = require("../services/leonardoImageService");

async function generateProductImage(req, res) {
  const productUrl = req.body.productUrl;
  const file = req.file;

  console.log(
    "[images] POST /generate",
    productUrl ? `${productUrl.slice(0, 50)}...` : "-",
    file ? `${(file.size / 1024).toFixed(0)}KB` : "no file",
  );

  try {
    if (!productUrl?.trim()) {
      console.log("[images] 400 productUrl required");
      return res.status(400).json({ error: "productUrl is required" });
    }
    try {
      new URL(productUrl);
    } catch {
      console.log("[images] 400 invalid URL");
      return res.status(400).json({ error: "productUrl must be a valid URL" });
    }
    if (!file) {
      console.log("[images] 400 sampleImage required");
      return res.status(400).json({ error: "sampleImage is required" });
    }

    const sampleBase64 = file.buffer.toString("base64");
    const mimeType = file.mimetype || "image/jpeg";

    console.log("[images] scrape");
    const scrapedHtml = await scraperService.scrapeProductPage(productUrl);

    console.log("[images] description");
    const productDescription =
      await llmService.getProductDescription(scrapedHtml);

    console.log("[images] prompt");
    const imagePrompt = await llmService.getImagePromptFromSample(
      sampleBase64,
      productDescription,
      mimeType,
    );

    console.log("[images] image");
    const image = await imageGenService.generateImage(imagePrompt);
    const sizeKb = ((image.data.length * 3) / 4 / 1024).toFixed(0);
    console.log("[images] 200", sizeKb + "KB");

    res.setHeader("Content-Type", image.mimeType);
    res.send(Buffer.from(image.data, "base64"));
  } catch (err) {
    const message = err.message || "Image generation failed";
    const step =
      !err.message?.includes("Scraping") && !err.message?.includes("Scraper")
        ? err.message?.includes("GEMINI")
          ? "llm"
          : err.message?.includes("IMAGE_GEN") ||
              err.message?.includes("Image API")
            ? "image"
            : ""
        : "scrape";
    console.log("[images] error", step ? `(${step}) ` : "", message);
    const status =
      err.response?.status === 404 || message.includes("not configured")
        ? 400
        : 502;
    res.status(status).json({ error: message });
  }
}

async function generateLeonardoImageHandler(req, res) {
  const productUrl = req.body.productUrl;
  const apiKey = req.body.apiKey;
  const file = req.file;

  try {
    // Basic validation
    if (!productUrl?.trim()) {
      console.log("[images] 400 productUrl required (leonardo)");
      return res.status(400).json({ error: "productUrl is required" });
    }
    try {
      new URL(productUrl);
    } catch {
      console.log("[images] 400 invalid URL (leonardo)");
      return res.status(400).json({ error: "productUrl must be a valid URL" });
    }
    if (!file) {
      console.log("[images] 400 sampleImage required (leonardo)");
      return res.status(400).json({ error: "sampleImage is required" });
    }
    if (!apiKey?.trim()) {
      console.log("[images] 400 apiKey required (leonardo)");
      return res.status(400).json({ error: "apiKey is required" });
    }

    const sampleBase64 = file.buffer.toString("base64");
    const mimeType = file.mimetype || "image/jpeg";

    // Step 1: scrape product page
    console.log("[images] scrape (leonardo)");
    const scrapedHtml = await scraperService.scrapeProductPage(productUrl);

    // Step 2: get structured product description
    console.log("[images] description (leonardo)");
    const productDescription =
      await llmService.getProductDescription(scrapedHtml);

    // Step 3: build final prompt from sample image + description
    console.log("[images] prompt (leonardo)");
    const imagePrompt = await llmService.getImagePromptFromSample(
      sampleBase64,
      productDescription,
      mimeType,
    );

    // Step 4: build Leonardo payload from backend prompt + frontend config
    const {
      modelId,
      num_images,
      width,
      height,
      styleUUID,
      contrast,
      enhancePrompt,
      ...rest
    } = req.body || {};

    const payload = {
      modelId: modelId || "b2614463-296c-462a-9586-aafdb8f00e36",
      prompt: imagePrompt,
    };

    if (num_images !== undefined) payload.num_images = Number(num_images);
    if (width !== undefined) payload.width = Number(width);
    if (height !== undefined) payload.height = Number(height);
    if (styleUUID !== undefined) payload.styleUUID = styleUUID;
    if (contrast !== undefined) payload.contrast = Number(contrast);
    if (enhancePrompt !== undefined) {
      // accept "true"/"false" or boolean
      payload.enhancePrompt =
        typeof enhancePrompt === "string"
          ? enhancePrompt.toLowerCase() === "true"
          : Boolean(enhancePrompt);
    }

    // Pass through any extra Leonardo fields if present (except ones we already handled)
    Object.entries(rest).forEach(([key, value]) => {
      if (
        ![
          "productUrl",
          "apiKey",
          "sampleImage",
          "modelId",
          "num_images",
          "width",
          "height",
          "styleUUID",
          "contrast",
          "enhancePrompt",
        ].includes(key)
      ) {
        payload[key] = value;
      }
    });

    console.log("[images] leonardo call");
    const data = await generateLeonardoImage({ apiKey, payload });
    console.log("[images] leonardo 200");
    return res.status(200).json(data);
  } catch (err) {
    let message = "Leonardo image generation failed";
    if (err.response?.data) {
      const leoError =
        typeof err.response.data === "object" && err.response.data.error
          ? err.response.data.error
          : typeof err.response.data === "string"
            ? err.response.data.slice(0, 200)
            : null;
      message = leoError
        ? `Failed from Leonardo: ${leoError}`
        : `Failed from Leonardo (${err.response.status})`;
    } else if (err.message) {
      message = `Failed from Leonardo: ${err.message}`;
    }
    console.log("[images] error (leonardo)", message);
    const status =
      err.response?.status &&
      err.response.status >= 400 &&
      err.response.status < 600
        ? err.response.status
        : 502;
    return res.status(status).json({ error: message });
  }
}

module.exports = { generateProductImage, generateLeonardoImageHandler };
