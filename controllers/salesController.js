const express = require('express');
const { makeLLMRequest } = require('./llmController');
const prompts = require('../utils/prompts');

const router = express.Router();

/** Strip markdown bold (**text**) to plain text so product names etc. don't show asterisks */
function stripMarkdownBold(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

// Generate sales text
async function generateSalesText(analysis, pricing, confirmedProductName = null, additionalHints = null, confirmedProductNotes = null) {
    const start = Date.now();
    console.log('📝 Generating sales text...');

    try {
        const prompt = prompts.salesText(analysis, pricing, confirmedProductName, additionalHints, confirmedProductNotes);
        let salesText = await makeLLMRequest(prompt, null, false); // Disable cache for sales text - each product is unique
        salesText = stripMarkdownBold(salesText);

        const duration = Date.now() - start;
        console.log(`✅ Sales text generation completed in ${duration}ms`);

        return salesText;

    } catch (error) {
        console.error('Sales text generation error:', error);
        throw new Error(`Sales text generation failed: ${error.message}`);
    }
}

// Generate sales text endpoint
router.post('/generate-sales-text', express.json(), async (req, res) => {
    try {
        const { analysis, pricing, userHint, confirmedProductName, additionalHints, confirmedProductNotes } = req.body;

        if (!analysis || !pricing) {
            return res.status(400).json({ error: 'Analysis and pricing are required' });
        }

        const salesText = await generateSalesText(analysis, pricing, confirmedProductName || null, additionalHints, confirmedProductNotes || null);

        res.json({
            success: true,
            salesText
        });

    } catch (error) {
        console.error('Sales text generation error:', error);
        res.status(500).json({
            error: 'Sales text generation failed',
            message: error.message
        });
    }
});

module.exports = {
    router,
    generateSalesText
};

