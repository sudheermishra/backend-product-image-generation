const axios = require('axios');

const LEONARDO_BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1/generations';
const POLL_INTERVAL_MS = 4000;
const MAX_WAIT_MS = 120000; // 2 minutes

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Two-step Leonardo flow:
 * 1) POST /generations -> get generationId
 * 2) Poll GET /generations/{id} until status COMPLETE, then return result.
 *
 * All config (modelId, prompt, etc.) and the API key come from the caller.
 *
 * @param {object} options
 * @param {string} options.apiKey - Leonardo API key (Bearer token).
 * @param {object} options.payload - Payload to send to Leonardo (modelId, prompt, etc.).
 * @returns {Promise<object>} Final GET /generations/{id} JSON response.
 */
async function generateLeonardoImage({ apiKey, payload }) {
  if (!apiKey) {
    throw new Error('LEONARDO_API_KEY is required in request body');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload is required in request body');
  }

  try {
    // Step 1: create generation job
    const createRes = await axios.post(LEONARDO_BASE_URL, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (createRes.status < 200 || createRes.status >= 300) {
      const snippet =
        typeof createRes.data === 'string'
          ? createRes.data.slice(0, 200)
          : JSON.stringify(createRes.data || {}).slice(0, 200);
      throw new Error(`Leonardo error ${createRes.status}: ${snippet}`);
    }

    const generationId = createRes.data?.sdGenerationJob?.generationId;
    if (!generationId) {
      throw new Error('Leonardo response missing sdGenerationJob.generationId');
    }

    // Step 2: poll for result
    const start = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (Date.now() - start > MAX_WAIT_MS) {
        throw new Error('Leonardo generation polling timed out');
      }

      const res = await axios.get(`${LEONARDO_BASE_URL}/${generationId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (res.status < 200 || res.status >= 300) {
        const snippet =
          typeof res.data === 'string'
            ? res.data.slice(0, 200)
            : JSON.stringify(res.data || {}).slice(0, 200);
        throw new Error(`Leonardo poll error ${res.status}: ${snippet}`);
      }

      const status = res.data?.generations_by_pk?.status;
      if (status === 'COMPLETE') {
        return res.data;
      }
      if (status === 'FAILED' || status === 'ERROR') {
        throw new Error('Leonardo generation failed');
      }

      await sleep(POLL_INTERVAL_MS);
    }
  } catch (err) {
    // Do not log the API key here; only status/message.
    const status = err.response?.status;
    const body = err.response?.data;
    const snippet =
      typeof body === 'string'
        ? body.slice(0, 200)
        : JSON.stringify(body || {}).slice(0, 200);
    console.log('[leonardo] error', status || err.code || '', snippet);
    throw err;
  }
}

module.exports = { generateLeonardoImage };


