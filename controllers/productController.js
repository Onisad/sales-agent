const express = require('express');
const multer = require('multer');
const { analyzeImageWithHint } = require('./visionController');
const { makeLLMRequest, makeVisionModelRequest } = require('./llmController');
const prompts = require('../utils/prompts');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Identify product endpoint
router.post('/identify-product', upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    console.log('🔍 Product identification request received');

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const { productTitle, hint } = req.body;
        const productTitleText = productTitle ? productTitle.trim() : '';
        
        console.log(`📝 Product title: "${productTitleText || 'None'}"`);
        console.log(`💡 Hint: "${hint || 'None'}"`);

        // Use Buffer directly for Google Vision API (more efficient)
        // Only convert to base64 for LLM vision models (required by API)
        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64'); // Only needed for LLM vision models

        // Run Vision API and Vision Model analyses in parallel
        console.log('🔍 Starting parallel analyses: Google Vision API and Vision Model...');
        
        const visionStartTime = Date.now();
        const analysisStartTime = Date.now();

        // Vision API analysis (with optional hint) - uses Buffer directly
        const visionPromise = analyzeImageWithHint(imageBuffer, productTitleText || hint || null).then(result => {
            const visionTime = Date.now() - visionStartTime;
            console.log(`✅ Google Vision analysis completed in ${visionTime}ms`);
            return { result, time: visionTime };
        });

        // Vision Model analysis (independent, doesn't wait for Vision API) - requires base64
        const visionModelPrompt = prompts.visionModelProductIdentification(productTitleText, hint);
        const visionModelPromise = makeVisionModelRequest(visionModelPrompt, base64Image).then(result => {
            const analysisTime = Date.now() - analysisStartTime;
            console.log(`✅ Vision Model analysis completed in ${analysisTime}ms`);
            return { result, time: analysisTime };
        }).catch(error => {
            console.error('❌ Vision Model analysis failed:', error);
            const analysisTime = Date.now() - analysisStartTime;
            return { result: `Vision Model analysis failed: ${error.message}`, time: analysisTime };
        });

        // Wait for both analyses to complete
        const [visionResult, visionModelResult] = await Promise.all([visionPromise, visionModelPromise]);
        
        const productData = visionResult.result;
        const analysis = visionModelResult.result;
        const visionTime = visionResult.time;
        const analysisTime = visionModelResult.time;

        // Extract product suggestion from vision model analysis (first line only)
        const extractProductFromVisionModel = (analysisText) => {
            if (!analysisText || !analysisText.trim()) return null;
            
            const text = analysisText.trim();
            console.log('🔍 Extracting product from vision model analysis:', text.substring(0, 200));
            
            // Get the first line (everything before first newline or period+space)
            const firstLine = text.split('\n')[0].split(/\.\s+/)[0].trim();
            
            if (!firstLine || firstLine.length < 3) {
                console.log('⚠️ First line is too short or empty');
                return null;
            }
            
            // Clean up the first line
            let productName = firstLine.trim();
            
            // Remove common prefixes
            productName = productName.replace(/^(?:Product|Item|Identified|This is|This appears|This looks)[:,\s]+/i, '');
            
            // Remove trailing punctuation and common words
            productName = productName.replace(/[.,;:!?]+$/, '').trim();
            
            // Check if it's a valid product name (not analysis text)
            if (productName.length > 3 && productName.length < 100 &&
                !productName.toLowerCase().includes('analysis') &&
                !productName.toLowerCase().includes('image') &&
                !productName.toLowerCase().includes('please provide') &&
                !productName.toLowerCase().startsWith('i need') &&
                !productName.toLowerCase().startsWith('i cannot')) {
                console.log('✅ Extracted product name from first line:', productName);
                return productName;
            }
            
            console.log('⚠️ First line does not appear to be a valid product name:', firstLine);
            return null;
        };

        // Initialize productCandidates if it doesn't exist
        if (!productData.productCandidates) {
            productData.productCandidates = [];
        }

        // Add vision model suggestion to product candidates if available (ALWAYS prioritize it)
        const visionModelProduct = extractProductFromVisionModel(analysis);
        console.log('🎯 Vision model product extracted:', visionModelProduct);
        console.log('📋 Current product candidates:', productData.productCandidates?.length || 0);
        
        if (visionModelProduct) {
            const normalizedVisionProduct = visionModelProduct.toLowerCase().trim();
            
            // Remove any existing candidates that match the vision model product (vision model is better)
            productData.productCandidates = productData.productCandidates.filter(c => {
                const normalized = c.name.toLowerCase().trim();
                const isDuplicate = normalized === normalizedVisionProduct || 
                                  normalized.includes(normalizedVisionProduct) ||
                                  normalizedVisionProduct.includes(normalized);
                if (isDuplicate) {
                    console.log(`🔄 Removed duplicate candidate "${c.name}" in favor of vision model product`);
                }
                return !isDuplicate;
            });
            
            // Always add vision model product as first candidate (highest priority)
            productData.productCandidates.unshift({
                id: 'vision_model_0',
                name: visionModelProduct,
                confidence: 0.9, // Higher confidence for vision model
                source: 'vision_model',
                description: analysis.substring(0, 150) + (analysis.length > 150 ? '...' : '')
            });
            console.log('✅ Added vision model product as first candidate:', visionModelProduct);
        } else {
            console.log('⚠️ No product extracted from vision model analysis');
        }
        
        // Sort candidates to ensure vision_model is always first
        productData.productCandidates.sort((a, b) => {
            if (a.source === 'vision_model') return -1;
            if (b.source === 'vision_model') return 1;
            return (b.confidence || 0) - (a.confidence || 0);
        });
        
        console.log('📋 Final product candidates count:', productData.productCandidates.length);

        const totalTime = Date.now() - startTime;
        console.log(`✅ Product identification completed in ${totalTime}ms (Vision API: ${visionTime}ms, Vision Model: ${analysisTime}ms)`);

        res.json({
            success: true,
            productData,
            analysis,
            googleVisionSummary: `Analysis completed in ${totalTime}ms (Vision API: ${visionTime}ms, Vision Model: ${analysisTime}ms)`,
            timing: {
                total: totalTime,
                vision: visionTime,
                analysis: analysisTime
            }
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ Product identification failed after ${totalTime}ms:`, error);
        res.status(500).json({
            error: 'Product identification failed',
            message: error.message,
            timing: { total: totalTime }
        });
    }
});

// Complete analysis endpoint
router.post('/complete-analysis', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const { productTitle, hint } = req.body;
        if (!productTitle || !productTitle.trim()) {
            return res.status(400).json({ error: 'Product title is required' });
        }

        // Use Buffer directly for Google Vision API (more efficient)
        const imageBuffer = req.file.buffer;

        // Analyze with Google Vision API
        const productData = await analyzeImageWithHint(imageBuffer, productTitle);

        // Generate analysis
        const analysisPrompt = prompts.completeAnalysis(productTitle, productData);
        const analysis = await makeLLMRequest(analysisPrompt, null, false); // Disable cache for product analysis

        res.json({
            success: true,
            productData,
            analysis,
            googleVisionSummary: 'Complete analysis generated successfully'
        });

    } catch (error) {
        console.error('Complete analysis error:', error);
        res.status(500).json({
            error: 'Complete analysis failed',
            message: error.message
        });
    }
});

// Generate detailed analysis from a selected candidate and vision data
router.post('/generate-analysis', async (req, res) => {
    try {
        const { candidate, googleVisionData, userHint } = req.body;
        if (!candidate || !googleVisionData) {
            return res.status(400).json({ error: 'Candidate and Google Vision data are required' });
        }

        const prompt = prompts.productAnalysis(candidate, googleVisionData, userHint);
        const analysis = await makeLLMRequest(prompt, null, false); // Disable cache for product analysis
        res.json({ analysis });
    } catch (error) {
        console.error('Generate analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

