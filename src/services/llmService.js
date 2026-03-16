const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_PROMPT_MODEL = 'gemini-2.5-flash';

// Keep Gemini input small to avoid rate limits (~1k tokens ≈ 4k chars)
const MAX_PAGE_INPUT_CHARS = 3000;
const MAX_DESCRIPTION_FOR_PROMPT_CHARS = 600;

function getClient() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

function preparePageText(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_PAGE_INPUT_CHARS);
}

async function getProductDescription(scrapedHtml) {
  const ai = getClient();
  const pageText = preparePageText(scrapedHtml);
  const { text } = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `You are extracting product information to create an accurate, high-quality product image later.

From the product page text below:
1. Identify the product name and category.
2. Note materials, textures, and finish (e.g. matte, glossy, metallic).
3. List exact colors and any color accents.
4. Describe shape, form, and proportions.
5. Pick 3–4 key visual details that must appear in the image (labels, buttons, distinctive design).
6. Note any brand or style context (e.g. premium, minimalist, sporty).

Output a single paragraph that summarizes all of the above clearly and completely. Write only the product summary, no preamble. This will be used to generate a product photo that must be accurate and aesthetic.

Product page text:
${pageText}`,
  });
  const out = text?.trim() || '';
  console.log('[llm] description ok');
  return out;
}

async function getImagePromptFromSample(sampleImageBase64, productDescription, mimeType = 'image/jpeg') {
  const ai = getClient();
  const shortDesc = productDescription.slice(0, MAX_DESCRIPTION_FOR_PROMPT_CHARS);
  const { text } = await ai.models.generateContent({
    model: IMAGE_PROMPT_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: mimeType,
          data: sampleImageBase64,
        },
      },
      {
        text: `You are creating an image-generation prompt for a product photo. Follow these steps in your reasoning, then output only the final prompt.

STEP 1 – ANALYZE THE SAMPLE IMAGE:
Describe: composition (framing, angle), lighting (soft/hard, direction, shadows), background (color, gradient, props), mood and style (e.g. clean, luxury, lifestyle), and color palette. Note what makes it aesthetically strong.

STEP 2 – PRODUCT TO SHOW (from description below):
${shortDesc}

STEP 3 – COMBINE FOR THE FINAL PROMPT:
Write a single, detailed image-generation prompt that:
- Keeps the exact product details (name, materials, colors, shape, key features) for accuracy.
- Reuses the sample’s style: same type of lighting, background style, composition, and mood for aesthetics.
- Adds quality terms: e.g. professional product photography, sharp focus, 4k, high resolution.

Output ONLY the final prompt, no labels or extra text. The prompt should be 2–4 sentences, specific and ready for an image model.`,
      },
    ],
  });
  const out = text?.trim() || '';
  console.log('[llm] prompt ok', out); // printing the prompt for debugging
  return out;
}

module.exports = { getProductDescription, getImagePromptFromSample };
