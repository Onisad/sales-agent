const express = require('express');
const vision = require('@google-cloud/vision');
const fs = require('fs');

const router = express.Router();

// Initialize Google Vision client
let visionClient = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS || fs.existsSync('google-vision-key.json')) {
    try {
        visionClient = new vision.ImageAnnotatorClient();
        console.log('✅ Google Vision API initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Google Vision API:', error);
    }
} else {
    console.warn('⚠️ Google Vision API credentials not found');
}

// Analyze image with Google Vision API
async function analyzeImageWithGoogleVision(imageBuffer) {
    if (!visionClient) {
        throw new Error('Google Vision API not initialized');
    }

    try {
        console.log('🔍 Analyzing image with Google Vision API...');
        const startTime = Date.now();

        // Perform multiple types of analysis
        const [labelResult, objectResult, textResult, webResult, colorResult] = await Promise.all([
            visionClient.labelDetection({ image: { content: imageBuffer } }),
            visionClient.objectLocalization({ image: { content: imageBuffer } }),
            visionClient.textDetection({ image: { content: imageBuffer } }),
            visionClient.webDetection({ image: { content: imageBuffer } }),
            visionClient.imageProperties({ image: { content: imageBuffer } })
        ]);

        const analysisTime = Date.now() - startTime;
        console.log(`✅ Google Vision analysis completed in ${analysisTime}ms`);

        // Extract labels
        const labels = labelResult[0].labelAnnotations || [];
        const detectedObjects = labels.map(label => label.description).slice(0, 10);
        const confidence = labels.length > 0 ? labels[0].score : 0;

        // Extract objects
        const objects = objectResult[0].localizedObjectAnnotations || [];
        const objectNames = objects.map(obj => obj.name).slice(0, 5);

        // Extract text
        const textAnnotations = textResult[0].textAnnotations || [];
        const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

        // Extract web detection results
        const webDetection = webResult[0].webDetection || {};
        const similarProducts = (webDetection.visuallySimilarImages || []).slice(0, 5).map(img => img.url);
        const bestGuessLabels = (webDetection.bestGuessLabels || []).slice(0, 3).map(label => label.label);
        const pagesWithMatchingImages = (webDetection.pagesWithMatchingImages || []).slice(0, 3);

        // Extract dominant colors
        const imageProperties = colorResult[0].imagePropertiesAnnotation || {};
        const dominantColors = (imageProperties.dominantColors?.colors || []).slice(0, 5).map(color => {
            const rgb = color.color;
            return `rgb(${Math.round(rgb.red || 0)}, ${Math.round(rgb.green || 0)}, ${Math.round(rgb.blue || 0)})`;
        });

        // Build product candidates from multiple signal sources
        const candidatePool = [];
        const pushCandidate = (id, name, conf, source, description) => {
            if (!name || !name.trim()) return;
            candidatePool.push({ id, name, confidence: conf || 0, source, description: description || name });
        };

        // From localized objects
        (objects || []).slice(0, 5).forEach((obj, idx) => {
            pushCandidate(`object_${idx}`, obj.name, obj.score, 'object_detection', `${obj.name} (${Math.round((obj.score || 0) * 100)}% confidence)`);
        });

        // From top labels
        (labels || []).slice(0, 5).forEach((lbl, idx) => {
            pushCandidate(`label_${idx}`, lbl.description, lbl.score, 'label_detection', `${lbl.description} (${Math.round((lbl.score || 0) * 100)}% confidence)`);
        });

        // From web best guess labels
        (bestGuessLabels || []).slice(0, 3).forEach((label, idx) => {
            pushCandidate(`bestguess_${idx}`, label, 0.6, 'best_guess', `${label}`);
        });

        // Deduplicate by normalized name and sort by confidence
        const seen = new Set();
        const productCandidates = candidatePool
            .filter(c => {
                const key = c.name.toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
            .slice(0, 5);

        return {
            detectedObjects: [...new Set([...detectedObjects, ...objectNames])],
            confidence,
            similarProducts,
            dominantColors,
            extractedText,
            webDetection: {
                bestGuessLabels,
                pagesWithMatchingImages,
                visuallySimilarImages: (webDetection.visuallySimilarImages || []).slice(0, 3)
            },
            productCandidates
        };
    } catch (error) {
        console.error('Google Vision API error:', error);
        throw new Error(`Google Vision API failed: ${error.message}`);
    }
}

// Analyze image (base64 input - legacy support)
async function analyzeImage(base64Image) {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    return await analyzeImageWithGoogleVision(imageBuffer);
}

// Analyze image with user hint (accepts Buffer or base64 string)
async function analyzeImageWithHint(imageInput, userHint = null) {
    // Accept either Buffer or base64 string for backward compatibility
    let imageBuffer;
    if (Buffer.isBuffer(imageInput)) {
        imageBuffer = imageInput;
    } else if (typeof imageInput === 'string') {
        imageBuffer = Buffer.from(imageInput, 'base64');
    } else {
        throw new Error('Invalid image input: expected Buffer or base64 string');
    }

    const visionData = await analyzeImageWithGoogleVision(imageBuffer);

    // If user provided a hint, add it to the detected objects
    if (userHint && userHint.trim()) {
        visionData.detectedObjects.unshift(userHint.trim());
        visionData.detectedObjects = [...new Set(visionData.detectedObjects)]; // Remove duplicates
    }

    return visionData;
}

module.exports = {
    router,
    analyzeImage,
    analyzeImageWithHint,
    analyzeImageWithGoogleVision
};

