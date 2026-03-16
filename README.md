# Backend

Express API for product image generation and video generation.

## Run

```bash
npm install
# add your .env keys
npm start
```

Server runs on `http://localhost:3000` (or `PORT` from env).

## Env

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default 3000) |
| `SCRAPER_API_KEY` | ScraperAPI key for fetching product pages |
| `GEMINI_API_KEY` | Google Gemini (LLM + Veo video) |
| `IMAGE_GEN_API_URL` | Edge Image Generation API using Cloudflare Workers AI base URL () |
| `IMAGE_GEN_API_TOKEN` | Bearer token for image API |

## Endpoints

### Image generation — `POST /api/images/generate`

Input: product page URL + reference image. Backend scrapes the URL, uses Gemini to get a product description and a style-aware prompt from the reference image, then calls the image API to generate a new product image.

**Form fields:** `productUrl` (text), `sampleImage` (file, JPEG/PNG/WebP, max 10MB).

**Response:** Image bytes (e.g. PNG).

### Leonardo image generation — `POST /api/images/leonardo`

Direct proxy to Leonardo image generation. Frontend sends the Leonardo API key and full payload; backend forwards it and returns Leonardo's JSON.

**Body (JSON):**

Either:

```json
{
  "apiKey": "LEONARDO_API_KEY",
  "payload": {
    "modelId": "...",
    "prompt": "...",
    "num_images": 4,
    "width": 1024,
    "height": 1024
  }
}
```

or:

```json
{
  "apiKey": "LEONARDO_API_KEY",
  "modelId": "...",
  "prompt": "...",
  "num_images": 4
}
```

All fields except `apiKey` are passed through to Leonardo as-is.

### Video generation — `POST /api/videos/generate`

Input: text prompt + image. Backend sends them to Veo 3 (Gemini) and returns the generated video.

**Form fields:** `prompt` (text), `image` (file, JPEG/PNG/WebP, max 10MB).

**Response:** Video bytes (e.g. MP4). Generation can take 1–3+ minutes.

## Structure

- `src/index.js` — entry, starts server
- `src/app.js` — Express app, routes, error handler
- `src/config` — env config
- `src/controllers` — request handlers
- `src/routes` — image and video routes
- `src/services` — scraper, LLM (Gemini), image API, video (Veo)
- `src/middleware` — multer upload (single file, 10MB, image types only)
