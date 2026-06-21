/**
 * Extract numeric price from pricing string
 * @param {string} priceString - Price string like "€50", "€100-€150", etc.
 * @returns {number} - Numeric price value
 */
function extractPrice(priceString) {
    if (!priceString || priceString === '€N/A') {
        return 0;
    }

    // Remove currency symbols and extract first number
    const cleanPrice = priceString.replace(/[€$£,]/g, '').trim();

    // Handle ranges like "€100-€150" by taking the lower value
    const rangeMatch = cleanPrice.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
        return parseInt(rangeMatch[1], 10);
    }

    // Extract first number found
    const numberMatch = cleanPrice.match(/(\d+)/);
    if (numberMatch) {
        return parseInt(numberMatch[1], 10);
    }

    return 0;
}

/**
 * Generate item title from detected object or product name
 * @param {string} detectedObject - Detected object from analysis
 * @param {string} productName - Product name from user input
 * @returns {string} - Clean item title
 */
function generateTitleFromDetectedObject(detectedObject, productName) {
    // Use product name if provided
    if (productName && productName.trim() && productName !== 'Unknown Product') {
        return cleanTitle(productName);
    }

    // Use detected object if available
    if (detectedObject && detectedObject.trim()) {
        return cleanTitle(detectedObject);
    }

    return 'Unknown Item';
}

/**
 * Clean up title by removing markdown and formatting
 * @param {string} title - Raw title
 * @returns {string} - Clean title
 */
function cleanTitle(title) {
    if (!title) return 'Unknown Item';

    let cleanTitle = title
        .replace(/\*\*/g, '') // Remove ** markdown
        .replace(/\*/g, '') // Remove single * markdown
        .replace(/^#+\s*/, '') // Remove markdown headers
        .replace(/^[-*]\s*/, '') // Remove list markers
        .replace(/^[0-9]+\.\s*/, '') // Remove numbered lists
        .replace(/^(This is|This appears to be|I can see|The image shows)/i, '')
        .replace(/^(a|an|the)\s+/i, '')
        .trim();

    // Capitalize first letter
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    // Limit length
    if (cleanTitle.length > 80) {
        cleanTitle = cleanTitle.substring(0, 77) + '...';
    }

    return cleanTitle;
}

/**
 * Generate item title from sales text (fallback)
 * @param {string} salesText - Sales text
 * @returns {string} - Clean item title
 */
function generateTitleFromSalesText(salesText) {
    if (!salesText) return 'Unknown Item';

    // Look for product name in sales text (not first line which might be a step)
    const lines = salesText.split('\n');

    // Look for lines that contain product names (usually have ** around them)
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('**') && trimmedLine.length > 5 && trimmedLine.length < 100) {
            // This looks like a product name
            return cleanTitle(trimmedLine);
        }
    }

    // Fallback to first line if no product name found
    const firstLine = lines[0]?.trim();
    if (firstLine) {
        return cleanTitle(firstLine);
    }

    return 'Unknown Item';
}

/**
 * Generate item title from analysis (fallback)
 * @param {string} analysis - Product analysis text
 * @returns {string} - Clean item title
 */
function generateTitleFromAnalysis(analysis) {
    if (!analysis) return 'Unknown Item';

    // Extract first meaningful sentence or phrase
    const sentences = analysis.split(/[.!?]/);
    const firstSentence = sentences[0]?.trim();

    if (!firstSentence) return 'Unknown Item';

    // Clean up the title
    let title = firstSentence
        .replace(/^(This is|This appears to be|I can see|The image shows)/i, '')
        .replace(/^(a|an|the)\s+/i, '')
        .trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Limit length
    if (title.length > 80) {
        title = title.substring(0, 77) + '...';
    }

    return title;
}

/**
 * Generate item description from sales text
 * @param {string} salesText - Generated sales text
 * @returns {string} - Clean description
 */
function generateDescription(salesText) {
    if (!salesText) return 'No description available';

    // Clean up the sales text for description
    let description = salesText
        .replace(/No offer below asking.*$/s, '') // Remove the standard ending
        .replace(/Check.*ads here.*$/s, '') // Remove the link
        .trim();

    // Limit description length
    if (description.length > 900) {
        description = description.substring(0, 897) + '...';
    }

    return description;
}

/**
 * Determine item condition from analysis
 * @param {string} analysis - Product analysis
 * @returns {string} - Condition (excellent, good, fair, poor)
 */
function determineCondition(analysis) {
    if (!analysis) return 'good';

    const lowerAnalysis = analysis.toLowerCase();

    if (lowerAnalysis.includes('excellent') || lowerAnalysis.includes('perfect') || lowerAnalysis.includes('mint')) {
        return 'excellent';
    }

    if (lowerAnalysis.includes('good') || lowerAnalysis.includes('great') || lowerAnalysis.includes('very good')) {
        return 'good';
    }

    if (lowerAnalysis.includes('fair') || lowerAnalysis.includes('average') || lowerAnalysis.includes('decent')) {
        return 'fair';
    }

    if (lowerAnalysis.includes('poor') || lowerAnalysis.includes('damaged') || lowerAnalysis.includes('worn')) {
        return 'poor';
    }

    return 'good'; // Default
}

module.exports = {
    extractPrice,
    generateTitleFromDetectedObject,
    generateTitleFromSalesText,
    generateTitleFromAnalysis,
    generateDescription,
    determineCondition,
    cleanTitle
};
