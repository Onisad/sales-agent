const express = require('express');
const axios = require('axios');
const itemService = require('../services/itemService');

const router = express.Router();

// Check LM Studio status via its OpenAI-compatible /v1/models endpoint
router.get('/lmstudio', async (req, res) => {
    const baseUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234';
    try {
        const response = await axios.get(`${baseUrl}/v1/models`, { timeout: 4000 });
        const models = response.data?.data?.map(m => m.id) || [];
        res.json({ available: true, url: baseUrl, models });
    } catch (err) {
        const hint = err.code === 'ECONNREFUSED'
            ? 'LM Studio is not running — start it and enable the local server.'
            : err.message;
        res.json({ available: false, url: baseUrl, error: hint });
    }
});

// Check MongoDB / sales site database
router.get('/db', async (req, res) => {
    try {
        const categories = await itemService.getAllCategories();
        res.json({ connected: true, categories: categories.length });
    } catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});

module.exports = router;
