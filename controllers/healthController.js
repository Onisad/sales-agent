const express = require('express');
const axios = require('axios');
const itemService = require('../services/itemService');

const router = express.Router();

// Check Open WebUI server status
async function checkLLMServer() {
    try {
        const openWebUIUrl = process.env.OPEN_WEBUI_URL || 'https://ai.minmaxweb.com';

        // Prepare headers
        const headers = {};
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

        // Try to check Open WebUI health/status endpoint or models endpoint
        // Open WebUI typically provides /api/v1/models endpoint similar to OpenAI
        const response = await axios.get(`${openWebUIUrl}/api/v1/models`, {
            headers: headers,
            timeout: 5000
        });

        return {
            available: true,
            url: openWebUIUrl,
            models: response.data.data?.map(m => m.id) || response.data || []
        };
    } catch (error) {
        console.error('Open WebUI server check failed:', error.message);
        const openWebUIUrl = process.env.OPEN_WEBUI_URL || 'https://ai.minmaxweb.com';
        const rawMessage = error.message || 'Unknown error';
        const userMessage = rawMessage.includes('timeout')
            ? 'Connection timeout – check that the LLM server is running and reachable (OPEN_WEBUI_URL).'
            : rawMessage.includes('ECONNREFUSED') || rawMessage.includes('ENOTFOUND')
                ? 'Cannot reach LLM server – check OPEN_WEBUI_URL and network.'
                : rawMessage.includes('401') || rawMessage.includes('403')
                    ? 'LLM server rejected the request – check OPEN_WEBUI_API_KEY.'
                    : rawMessage;
        return {
            available: false,
            url: openWebUIUrl,
            error: rawMessage,
            message: userMessage
        };
    }
}

// Health check for LLM server
router.get('/llm', async (req, res) => {
    try {
        const status = await checkLLMServer();
        res.json(status);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            available: false,
            error: error.message
        });
    }
});

// Health check for sales site database
router.get('/sales-site', async (req, res) => {
    try {
        const categories = await itemService.getAllCategories();
        res.json({
            connected: true,
            categories: categories.length,
            message: 'Sales site database connected successfully'
        });
    } catch (error) {
        console.error('Sales site health check failed:', error);
        res.status(500).json({
            connected: false,
            error: error.message,
            message: 'Sales site database connection failed'
        });
    }
});

module.exports = router;

