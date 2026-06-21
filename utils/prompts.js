/**
 * Centralized prompt templates for AI model interactions
 * All prompts can be easily viewed and fine-tuned here
 */

module.exports = {
    /**
     * Vision Model Prompt - Product Identification
     * Used when identifying products from images
     */
    visionModelProductIdentification: (productTitle, hint) => {
        const context = productTitle 
            ? `The user says this is: "${productTitle}".` 
            : hint 
            ? `User hint: "${hint}".` 
            : 'Please identify what this product is.';

        return `Analyze this product image and provide a detailed assessment.

IMPORTANT: On the FIRST LINE, provide ONLY the product name (e.g., "Port Royal board game" or "iPhone 13 Pro"). Then on the following lines, provide your detailed analysis.

${context}

Format:
[Product Name]

Then provide a comprehensive analysis including:
1. Product identification and verification
2. Key features and characteristics
3. Condition assessment (if visible)
4. Market context and value indicators

Keep the analysis concise but informative. Focus on what you can see in the image.`;
    },

    /**
     * Product Analysis Prompt
     * Used to generate detailed product analysis for pricing
     */
    productAnalysis: (candidate, googleVisionData, userHint) => {
        let prompt = `Given the following product candidate and Google Vision API results, provide a detailed, specific product analysis for pricing and sales.

Product Candidate: ${typeof candidate === 'string' ? candidate : JSON.stringify(candidate)}

Google Vision API Results: ${JSON.stringify(googleVisionData)}
`;

        if (userHint && String(userHint).trim()) {
            prompt += `\nUSER HINT: "${String(userHint).trim()}" - Consider this hint and prioritize it if specific.`;
        }

        prompt += '\n\nBe specific about brand/model/type, condition, material, features, and notable details. Keep it concise but informative.';

        return prompt;
    },

    /**
     * Complete Analysis Prompt
     * Used for complete product analysis with title
     */
    completeAnalysis: (productTitle, productData) => {
        return `Analyze this product image and provide a detailed description. The user says this is: "${productTitle}".

Product Data from Google Vision:
- Detected Objects: ${productData.detectedObjects.join(', ')}
- Confidence: ${Math.round(productData.confidence * 100)}%
- Similar Products: ${productData.similarProducts.join(', ')}
- Dominant Colors: ${productData.dominantColors.join(', ')}

Please provide a comprehensive analysis of this product.`;
    },

    /**
     * Pricing Analysis Prompt
     * Used to generate pricing estimates
     */
    pricingAnalysis: (analysis, confirmedProductName = null, confirmedProductNotes = null) => {
        let prompt = `Analyze this product and provide pricing estimates in JSON format.`;

        // CRITICAL: If user has manually confirmed a product name, it is the AUTHORITATIVE source
        if (confirmedProductName && confirmedProductName.trim()) {
            prompt += `\n\n⚠️ AUTHORITATIVE PRODUCT IDENTIFICATION (USER CONFIRMED):
The user has manually confirmed this product is: "${confirmedProductName.trim()}"

THIS IS THE CORRECT PRODUCT NAME. Ignore any other product names mentioned in the analysis below. Use "${confirmedProductName.trim()}" as the authoritative product name for pricing research.`;
        }

        prompt += `\n\nProduct Analysis: ${analysis}`;

        if (confirmedProductNotes && confirmedProductNotes.trim()) {
            prompt += `\n\nIMPORTANT ADDITIONAL INFORMATION FROM USER:
${confirmedProductNotes.trim()}

This information should be given HIGH PRIORITY when determining pricing, as it comes directly from the user who knows the product details.`;
        }

        prompt += `\n\nPlease provide pricing in this exact JSON format:
{
    "newPrice": "€XXX",
    "usedPrice": "€XXX", 
    "reasoning": "Detailed explanation of pricing logic, market research, and factors considered"
}

IMPORTANT: In the reasoning field, use single quotes around price values instead of double quotes to avoid JSON parsing issues. For example, write '€30-€40' instead of "€30"-"€40".

Consider:
${confirmedProductName && confirmedProductName.trim() ? `- THE CONFIRMED PRODUCT NAME: "${confirmedProductName.trim()}" (this is the authoritative product, ignore any conflicting names in the analysis)` : ''}
- Current market prices for similar items
- Product condition and age
- Brand reputation and demand
- Seasonal factors
- Local market conditions
${confirmedProductNotes && confirmedProductNotes.trim() ? '- The additional user-provided information above (this is very important!)' : ''}

Return ONLY the JSON object, no markdown code blocks, no other text.`;

        return prompt;
    },

    /**
     * Sales Text Generation Prompt
     * Used to generate sales descriptions
     */
    salesText: (analysis, pricing, confirmedProductName = null, additionalHints = null, confirmedProductNotes = null) => {
        let prompt = `Create a short, friendly sales description for this product.`;

        // CRITICAL: If user has manually confirmed a product name, it is the AUTHORITATIVE source
        if (confirmedProductName && confirmedProductName.trim()) {
            prompt += `\n\n⚠️ AUTHORITATIVE PRODUCT IDENTIFICATION (USER CONFIRMED):
The user has manually confirmed this product is: "${confirmedProductName.trim()}"

THIS IS THE CORRECT PRODUCT NAME. You MUST use "${confirmedProductName.trim()}" in the sales text. Ignore any other product names mentioned in the analysis below.`;
        }

        prompt += `\n\nProduct Analysis: ${analysis}

Pricing:
- New Price: ${pricing.newPrice}
- Used Price: ${pricing.usedPrice}
- Reasoning: ${pricing.reasoning}`;

        if (confirmedProductNotes && confirmedProductNotes.trim()) {
            prompt += `\n\n⭐ PROMINENT USER NOTES - FEATURE THESE PROMINENTLY:
${confirmedProductNotes.trim()}

These notes are very important and should be featured prominently in the sales text. Make sure to incorporate these details naturally into the description.`;
        }

        if (additionalHints) {
            prompt += `\n\nAdditional Context: ${additionalHints}`;
        }

        prompt += `\n\nWrite a brief, friendly sales text (2-3 sentences maximum) that:
${confirmedProductName && confirmedProductName.trim() ? `- Uses the confirmed product name "${confirmedProductName.trim()}" (this is mandatory - do not use any other product name)` : ''}
${confirmedProductNotes && confirmedProductNotes.trim() ? '- Features the user-provided notes prominently (these are very important!)' : ''}
- Highlights the key feature or benefit
- Is honest about condition
- Uses friendly, conversational language
- Is appropriate for online marketplace

Use PLAIN TEXT only: no markdown, no asterisks (**), no bold or italic formatting. Write as normal prose.

CRITICAL: Always end with exactly this text (do not modify it):
"No offer below asking. No split, no swap! Cash or Paypal/Revolut and collection only!"

Write the sales text directly, no JSON format needed.`;

        return prompt;
    },

    /**
     * Category Determination Prompt
     * Used to determine the best category for a product
     */
    categoryDetermination: (analysis, productName, availableCategories) => {
        const categoryList = availableCategories.map(cat => `- ${cat.name}`).join('\n');
        
        let prompt = `Determine the best category for this product from the available categories.

Product Name: ${productName || 'Unknown'}
Product Analysis: ${analysis}

Available Categories:
${categoryList}

Instructions:
1. Analyze the product name and description
2. Match it to the most appropriate category from the list above
3. If you're not confident about the match, respond with "Uncategorized"
4. Return ONLY the category name (exactly as it appears in the list above, or "Uncategorized" if unsure)
5. Do not include any explanation, just the category name

Return format: Just the category name, nothing else.`;

        return prompt;
    }
};

