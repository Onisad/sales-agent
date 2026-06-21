// Pricing module
window.PricingModule = {
    // Function to display pricing results
    displayPricing: function (result) {
        const newPriceEl = document.getElementById('newPrice');
        const usedPriceEl = document.getElementById('usedPrice');
        const reasoningEl = document.getElementById('reasoning');
        const pricingSection = document.getElementById('pricingSection');
        const results = document.getElementById('results');

        if (newPriceEl) newPriceEl.textContent = result.pricing.newPrice;
        if (usedPriceEl) usedPriceEl.textContent = result.pricing.usedPrice;
        if (reasoningEl) reasoningEl.textContent = result.pricing.reasoning;

        if (pricingSection) pricingSection.style.display = 'block';
        if (results) results.scrollIntoView({ behavior: 'smooth' });

        window.SalesApp.currentPricing = result.pricing;
    },

    // Initialize pricing module
    init: function () {
        // Pricing functionality is handled by the complete analysis button
        // which is managed in the product-identification module
    }
};











