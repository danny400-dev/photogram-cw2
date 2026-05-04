const axios = require('axios');

const visionKey = process.env.VISION_KEY;
const visionEndpoint = (process.env.VISION_ENDPOINT || '').replace(/\/$/, ''); // strip trailing slash

/**
 * Call Azure AI Vision to analyze a photo at a given URL.
 * Returns an object with:
 *   - tags: array of strings (e.g. ["dog", "outdoor", "grass"])
 *   - description: short caption suggestion (string or null)
 *   - isAdultContent: boolean (for content moderation)
 */
async function analyzeImage(imageUrl) {
  if (!visionKey || !visionEndpoint) {
    console.warn('Vision credentials not set — skipping analysis.');
    return { tags: [], description: null, isAdultContent: false };
  }

  const url = `${visionEndpoint}/vision/v3.2/analyze`;
  const params = {
    visualFeatures: 'Tags,Description,Adult',
    language: 'en',
  };

  try {
    const response = await axios.post(url, { url: imageUrl }, {
      params,
      headers: {
        'Ocp-Apim-Subscription-Key': visionKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const data = response.data;
    return {
      tags: (data.tags || []).filter(t => t.confidence > 0.6).map(t => t.name).slice(0, 10),
      description: data.description?.captions?.[0]?.text || null,
      isAdultContent: data.adult?.isAdultContent || data.adult?.isRacyContent || false,
    };
  } catch (err) {
    console.error('Vision API error:', err.response?.data || err.message);
    // Don't fail the upload — just return empty analysis
    return { tags: [], description: null, isAdultContent: false };
  }
}

module.exports = { analyzeImage };