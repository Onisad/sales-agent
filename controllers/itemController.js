const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const itemService = require('../services/itemService');
const { extractPrice, determineCondition } = require('../utils/pricingHelper');
const { makeLLMRequest } = require('./llmController');
const prompts = require('../utils/prompts');
const { saveImageToDisk, deleteFile } = require('../utils/imageHelper');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Determine category for item using LLM
async function determineCategory(analysis, productName) {
    try {
        console.log('🏷️ Determining category for item...');
        
        // Get all available categories from database
        const availableCategories = await itemService.getAllCategories();
        
        if (!availableCategories || availableCategories.length === 0) {
            console.log('⚠️ No categories found in database, using Uncategorized');
            return 'Uncategorized';
        }

        // Create prompt for category determination
        const prompt = prompts.categoryDetermination(analysis, productName, availableCategories);
        
        // Call LLM to determine category
        const categoryName = await makeLLMRequest(prompt, null, false, 50); // Disable cache, low token limit
        
        // Clean up the response (remove quotes, whitespace, etc.)
        const cleanedCategory = categoryName.trim().replace(/^["']|["']$/g, '').trim();
        
        // Verify the category exists in our list
        const categoryExists = availableCategories.some(cat => 
            cat.name.toLowerCase() === cleanedCategory.toLowerCase()
        );
        
        if (categoryExists) {
            console.log(`✅ Determined category: ${cleanedCategory}`);
            return cleanedCategory;
        } else {
            console.log(`⚠️ LLM returned "${cleanedCategory}" which doesn't exist, using Uncategorized`);
            return 'Uncategorized';
        }
    } catch (error) {
        console.error('❌ Error determining category:', error.message);
        console.log('⚠️ Falling back to Uncategorized');
        return 'Uncategorized';
    }
}

// Create item in sales site
async function createItemInSalesSite(itemInputData) {
    try {
        console.log('🛒 Creating item in sales site...');

        const { analysis, pricing, salesText, productName, image } = itemInputData;

        // Extract price from pricing data
        const price = extractPrice(pricing.usedPrice || pricing.newPrice);

        // Title: Use confirmed product name (authoritative)
        // Description: Use the generated sales text directly
        const title = productName && productName.trim() && productName !== 'Unknown Product' 
            ? productName.trim() 
            : 'Product';
        const description = salesText && salesText.trim() ? salesText.trim() : '';
        const condition = determineCondition(analysis);

        // Determine category using LLM
        const categoryName = await determineCategory(analysis, productName);

        // Create item data
        // Images should be an array - handle both single image and array
        const images = image 
            ? (Array.isArray(image) ? image : [image])
            : [];

        const itemData = {
            title,
            description,
            price,
            condition,
            category: categoryName, // Determined category
            isPublished: false, // Create as draft
            images: images
        };

        const result = await itemService.createItem(itemData);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to create item');
        }

        console.log('✅ Item created successfully:', result.item._id);

        return {
            success: true,
            item: {
                id: result.item._id.toString(),
                title: result.item.title,
                price: result.item.price,
                isPublished: result.item.isPublished
            }
        };

    } catch (error) {
        console.error('Item creation error:', error);
        throw new Error(`Item creation failed: ${error.message}`);
    }
}

// Create item endpoint
// Note: Router is mounted at both /item and /create-item in app.js
// This route handles both /item/ and /create-item/
router.post('/', upload.single('image'), async (req, res) => {
    // Determine upload method based on environment
    const useApiUpload = !!process.env.SALES_SITE_URL;
    let imageData = null;
    
    try {
        const { analysis, pricing, salesText, productName } = req.body;

        if (!analysis || !pricing || !salesText) {
            return res.status(400).json({ error: 'Analysis, pricing, and sales text are required' });
        }

        // Handle image based on upload method
        // If using API upload, pass buffer directly (no disk save needed)
        // Otherwise, save to disk for file copy method
        
        if (req.file && req.file.buffer) {
            if (useApiUpload) {
                // Pass buffer directly - API upload will handle conversion
                imageData = req.file.buffer;
                console.log(`📸 Using image buffer for API upload (${Math.round(req.file.buffer.length / 1024)}KB)`);
            } else {
                // Save to disk for file copy method
                const mimeType = req.file.mimetype || 'image/jpeg';
                imageData = await saveImageToDisk(req.file.buffer, mimeType);
                console.log(`📸 Saved image to disk: ${imageData} (${Math.round(req.file.buffer.length / 1024)}KB)`);
            }
        }

        const result = {
            analysis,
            pricing: JSON.parse(pricing),
            salesText,
            productName: productName || 'Unknown Product',
            image: imageData // Buffer for API upload, file path for file copy
        };

        const itemResult = await createItemInSalesSite(result);

        if (itemResult.success) {
            res.json({
                success: true,
                item: {
                    title: itemResult.item.title,
                    price: itemResult.item.price,
                    isPublished: itemResult.item.isPublished
                }
            });
        } else {
            // Clean up saved file if item creation failed (only for file copy method)
            if (!useApiUpload && imageData && typeof imageData === 'string') {
                try {
                    await deleteFile(imageData);
                } catch (cleanupError) {
                    console.warn(`⚠️ Failed to cleanup file after item creation failure: ${cleanupError.message}`);
                }
            }
            
            res.status(500).json({
                error: 'Item creation failed',
                message: itemResult.error
            });
        }

    } catch (error) {
        console.error('Item creation error:', error);
        
        // Clean up saved file if an error occurred (only for file copy method)
        if (!useApiUpload && imageData && typeof imageData === 'string') {
            try {
                await deleteFile(imageData);
            } catch (cleanupError) {
                console.warn(`⚠️ Failed to cleanup file after error: ${cleanupError.message}`);
            }
        }
        
        res.status(500).json({
            error: 'Item creation failed',
            message: error.message
        });
    }
});

module.exports = {
    router,
    createItemInSalesSite
};

