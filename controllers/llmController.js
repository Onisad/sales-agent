const axios = require('axios');
const crypto = require('crypto');

// Cache for responses to avoid duplicate requests
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Make request to Open WebUI (OpenAI-compatible API)
async function makeLLMRequest(prompt, model = null, useCache = true, maxTokens = 200) {
    // Generate a hash of the full prompt for a unique cache key
    // This ensures different products don't share cached responses
    const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
    const cacheKey = `${model || 'default'}:${promptHash}`;

    // Check cache first (only if caching is enabled)
    if (useCache) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('🚀 Using cached response');
            return cached.response;
        }
    }

    // Use exactly the model specified in environment variable
    const targetModel = model || process.env.TEXT_MODEL;
    if (!targetModel) {
        throw new Error('TEXT_MODEL environment variable not set');
    }

    // Open WebUI URL
    const openWebUIUrl = process.env.OPEN_WEBUI_URL || 'https://ai.minmaxweb.com';
    const apiEndpoint = `${openWebUIUrl}/api/v1/chat/completions`;

    console.log(`🤖 Using model: ${targetModel} via Open WebUI`);

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json'
    };

    // Add API key if provided
    const apiKey = process.env.OPEN_WEBUI_API_KEY;
    if (apiKey) {
        // Open WebUI uses OpenAI-compatible API - keys starting with 'sk-' use Authorization Bearer
        // LM Studio keys (starting with 'lm-') typically use 'api-key' header
        if (apiKey.toLowerCase().startsWith('sk-')) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (apiKey.toLowerCase().startsWith('lm-')) {
            headers['api-key'] = apiKey;
        } else {
            // Default to Authorization Bearer (OpenAI format)
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
    }

    // Add Cloudflare Access headers if provided
    const cfClientId = process.env.CF_ACCESS_CLIENT_ID;
    const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
    if (cfClientId && cfClientSecret) {
        headers['CF-Access-Client-Id'] = cfClientId;
        headers['CF-Access-Client-Secret'] = cfClientSecret;
    }

    // Open WebUI uses OpenAI-compatible chat completions API
    const response = await axios.post(apiEndpoint, {
        model: targetModel,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: false
    }, {
        headers: headers,
        timeout: 30000  // 30 seconds - reasonable timeout
    });

    // Extract response from OpenAI-compatible format
    // Add defensive checks for response structure
    if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Empty response from LLM API');
    }

    if (!response.data.choices || !Array.isArray(response.data.choices)) {
        console.error('❌ Unexpected response structure:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Invalid response structure from LLM API');
    }

    const result = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || '';

    if (!result) {
        throw new Error('No response content received from Open WebUI');
    }

    // Cache the response (only if caching is enabled)
    if (useCache) {
        responseCache.set(cacheKey, {
            response: result,
            timestamp: Date.now()
        });
    }

    return result;
}

// Make request to Open WebUI with image support for vision models
async function makeVisionModelRequest(prompt, base64Image, model = null) {
    // Use vision model from environment variable
    const targetModel = model || process.env.VISION_MODEL || process.env.TEXT_MODEL;
    if (!targetModel) {
        throw new Error('VISION_MODEL or TEXT_MODEL environment variable not set');
    }

    // Open WebUI URL
    const openWebUIUrl = process.env.OPEN_WEBUI_URL || 'https://ai.minmaxweb.com';
    const apiEndpoint = `${openWebUIUrl}/api/v1/chat/completions`;

    console.log(`🤖 Using vision model: ${targetModel} via Open WebUI`);

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json'
    };

    // Add API key if provided
    const apiKey = process.env.OPEN_WEBUI_API_KEY;
    if (apiKey) {
        if (apiKey.toLowerCase().startsWith('sk-')) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (apiKey.toLowerCase().startsWith('lm-')) {
            headers['api-key'] = apiKey;
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
    }

    // Add Cloudflare Access headers if provided
    const cfClientId = process.env.CF_ACCESS_CLIENT_ID;
    const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
    if (cfClientId && cfClientSecret) {
        headers['CF-Access-Client-Id'] = cfClientId;
        headers['CF-Access-Client-Secret'] = cfClientSecret;
    }

    // Prepare image data URL
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Open WebUI uses OpenAI-compatible chat completions API with vision support
    const response = await axios.post(apiEndpoint, {
        model: targetModel,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: prompt
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageDataUrl
                        }
                    }
                ]
            }
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: false
    }, {
        headers: headers,
        timeout: 60000  // 60 seconds for vision models (they can be slower)
    });

    // Extract response from OpenAI-compatible format
    // Add defensive checks for response structure
    if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Empty response from vision model API');
    }

    if (!response.data.choices || !Array.isArray(response.data.choices)) {
        console.error('❌ Unexpected response structure:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Invalid response structure from vision model API');
    }

    const result = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || '';

    if (!result) {
        throw new Error('No response content received from vision model');
    }

    return result;
}

module.exports = {
    makeLLMRequest,
    makeVisionModelRequest
};

