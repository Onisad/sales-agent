const express = require('express');
const { makeLLMRequest } = require('./llmController');
const { extractPrice, generateTitleFromDetectedObject, generateTitleFromSalesText, generateTitleFromAnalysis, generateDescription, determineCondition } = require('../utils/pricingHelper');
const prompts = require('../utils/prompts');

const router = express.Router();

// Fix unquoted euro values in JSON
// Only fixes values that are clearly unquoted (e.g., "newPrice": €50)
// Skips values that are already properly quoted (e.g., "newPrice": "€50")
function fixUnquotedEuroValues(jsonString) {
    // Check if price values are already properly quoted
    // If they are, don't modify the JSON
    if (/"(?:new|used)Price":\s*"[€\d\s-]+"/.test(jsonString)) {
        return jsonString; // Already properly formatted
    }
    
    // Only fix values that are clearly unquoted (follow colon directly without quotes)
    return jsonString.replace(/:\s*(€\d+(?:\.\d+)?)/g, ': "$1"');
}

// Generate pricing analysis
async function generatePricing(analysis, confirmedProductName = null, confirmedProductNotes = null) {
    const start = Date.now();
    console.log('💰 Generating pricing analysis...');

    try {
        const prompt = prompts.pricingAnalysis(analysis, confirmedProductName, confirmedProductNotes);
        // Use higher token limit for pricing (reasoning field can be long)
        const response = await makeLLMRequest(prompt, null, false, 800); // Disable cache, higher token limit for pricing

        // Try to extract JSON from response
        console.log('🔍 Full AI model response:', response);
        
        // First, try to extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
        // Use a more robust pattern that handles multiline JSON properly
        let jsonMatch = response.match(/```(?:json)?\s*\n?(\{[\s\S]*?\})\s*\n?```/) || response.match(/\{[\s\S]*\}/);
        
        // If still no match, try to find JSON after markdown code block markers
        if (!jsonMatch) {
            // Look for JSON that might be inside code blocks with more flexible matching
            const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                const innerContent = codeBlockMatch[1];
                jsonMatch = innerContent.match(/\{[\s\S]*\}/);
            }
        }
        
        if (!jsonMatch) {
            console.error('❌ No JSON found in response. Full response:', response);
            // Return a fallback pricing if no JSON is found
            return {
                newPrice: "€50.00",
                usedPrice: "€30.00",
                reasoning: "Unable to generate pricing analysis. Please try again or contact support."
            };
        }
        
        // If we matched a code block, use the captured group, otherwise use the full match
        let jsonString = jsonMatch[1] || jsonMatch[0];
        
        // Handle truncated JSON - if it doesn't end with }, try to close it properly
        if (!jsonString.trim().endsWith('}')) {
            console.log('⚠️ JSON appears to be truncated, attempting to fix...');
            jsonString = jsonString.trim();
            
            // If reasoning field exists but is incomplete, extract what we have and close it
            const reasoningStart = jsonString.indexOf('"reasoning":');
            if (reasoningStart > 0) {
                // Extract everything before reasoning
                const beforeReasoning = jsonString.substring(0, reasoningStart);
                // Extract reasoning content (from "reasoning": " to end)
                let reasoningContent = jsonString.substring(reasoningStart + 12).trim(); // 12 = length of "reasoning": 
                
                // Clean up incomplete reasoning - remove trailing incomplete word/sentence
                reasoningContent = reasoningContent
                    .replace(/[.,]\s*[^\s]*$/, '.') // Remove incomplete word after punctuation
                    .replace(/\s+\w+$/, '') // Remove last incomplete word
                    .trim();
                
                // Ensure reasoning ends properly
                if (reasoningContent && !reasoningContent.endsWith('.') && !reasoningContent.endsWith('!')) {
                    reasoningContent += '.';
                }
                
                // Reconstruct the JSON with properly closed reasoning
                jsonString = beforeReasoning + `"reasoning": "${reasoningContent}"}`;
            } else {
                // No reasoning field or it's complete, just close the JSON
                // Remove trailing comma if present
                jsonString = jsonString.replace(/,\s*$/, '') + '}';
            }
            console.log('🔧 Attempted to fix truncated JSON');
        }
        
        jsonString = fixUnquotedEuroValues(jsonString);

        // Add better error handling for JSON parsing
        let pricing;
        try {
            pricing = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.error('Problematic JSON string:', jsonString);
            
            // First, fix reasoning field separately (it may contain quotes that break JSON)
            // Find the reasoning field start
            const reasoningStartIdx = jsonString.indexOf('"reasoning":');
            if (reasoningStartIdx > 0) {
                // Find where reasoning value starts (after the opening quote)
                const valueStartIdx = jsonString.indexOf('"', reasoningStartIdx + 12) + 1;
                // Find where reasoning should end (before the closing quote and brace)
                // Look for the pattern: "} or ", (but handle quotes inside the string)
                let valueEndIdx = jsonString.length - 1;
                // Work backwards from the end to find the actual closing quote
                for (let i = jsonString.length - 1; i >= valueStartIdx; i--) {
                    if (jsonString[i] === '}' && jsonString[i - 1] === '"') {
                        valueEndIdx = i - 1;
                        break;
                    }
                }
                
                // Extract reasoning content
                let reasoning = jsonString.substring(valueStartIdx, valueEndIdx);
                // Remove quotes around euro values inside reasoning: "€40" -> €40
                reasoning = reasoning.replace(/"([€\d\s-]+)"/g, '$1');
                // Escape any remaining unescaped quotes
                reasoning = reasoning.replace(/\\"/g, '"').replace(/"/g, '\\"');
                
                // Replace the reasoning field
                jsonString = jsonString.substring(0, valueStartIdx) + 
                             reasoning + 
                             jsonString.substring(valueEndIdx);
            }
            
            // Try to fix common JSON issues
            jsonString = jsonString
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
                // Fix double-quoted euro values FIRST - handle patterns like ""€40"-"€55""
                // Match: ""€XX"-"€YY"" and replace with "€XX-€YY"
                .replace(/"newPrice":\s*""([€\d]+)"-([€\d]+)""/g, '"newPrice": "$1-$2"')
                .replace(/"usedPrice":\s*""([€\d]+)"-([€\d]+)""/g, '"usedPrice": "$1-$2"')
                // Then fix simple double-quoted values like ""€35""
                .replace(/"newPrice":\s*""([€\d\s-]+)""/g, '"newPrice": "$1"')
                .replace(/"usedPrice":\s*""([€\d\s-]+)""/g, '"usedPrice": "$1"')
                // Fix any remaining double quote patterns
                .replace(/""([€\d.]+)""/g, '"$1"')
                // Fix remaining double-quoted Euro symbols
                .replace(/""€/g, '"€')
                .replace(/€""/g, '€"')
                // Fix cases where quotes got inserted inside quoted strings
                .replace(/"([€\d]+)"-([€\d]+)"/g, '"$1-$2"')
                // Clean up any remaining double quotes issue
                .replace(/: ""/g, ': "')
                .replace(/""([,}])/g, '"$1');
            
            try {
                pricing = JSON.parse(jsonString);
            } catch (secondParseError) {
                console.error('Second JSON parsing attempt failed:', secondParseError);
                // Extract basic pricing info using regex as last resort
                // Handle various quote patterns
                const newPriceMatch = jsonString.match(/"newPrice":\s*"?(.*?)"?([,}])/);
                const usedPriceMatch = jsonString.match(/"usedPrice":\s*"?(.*?)"?([,}])/);
                const reasoningMatch = jsonString.match(/"reasoning":\s*"([^"]*(?:\\"[^"]*)*)"([,}])/);
                
                pricing = {
                    newPrice: newPriceMatch ? newPriceMatch[1].replace(/^"|"$/g, '').replace(/""/g, '"') : "€50.00",
                    usedPrice: usedPriceMatch ? usedPriceMatch[1].replace(/^"|"$/g, '').replace(/""/g, '"') : "€30.00",
                    reasoning: reasoningMatch ? reasoningMatch[1].replace(/\\"/g, '"') : "Unable to parse detailed reasoning due to JSON formatting issues."
                };
            }
        }

        const duration = Date.now() - start;
        console.log(`✅ Pricing analysis completed in ${duration}ms`);

        return pricing;

    } catch (error) {
        console.error('Pricing generation error:', error);
        throw new Error(`Pricing generation failed: ${error.message}`);
    }
}

// Generate pricing endpoint
router.post('/generate-pricing', express.json(), async (req, res) => {
    try {
        const { analysis, userHint, confirmedProductName, confirmedProductNotes } = req.body;

        if (!analysis) {
            return res.status(400).json({ error: 'Analysis is required' });
        }

        const pricing = await generatePricing(analysis, confirmedProductName || null, confirmedProductNotes || null);

        res.json({
            success: true,
            pricing
        });

    } catch (error) {
        console.error('Pricing generation error:', error);
        res.status(500).json({
            error: 'Pricing generation failed',
            message: error.message
        });
    }
});

module.exports = {
    router,
    generatePricing
};

