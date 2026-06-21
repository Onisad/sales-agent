// Sales text module
window.SalesTextModule = {
    // Function to display sales text results
    displaySalesText: function (result) {
        const salesTextEl = document.getElementById('salesText');
        const salesTextSection = document.getElementById('salesTextSection');
        const results = document.getElementById('results');
        const productActionsSection = document.getElementById('productActionsSection');

        if (salesTextEl) salesTextEl.textContent = result.salesText;

        if (salesTextSection) salesTextSection.style.display = 'block';
        if (results) results.scrollIntoView({ behavior: 'smooth' });

        // Hide the Generate Pricing & Sales Text button section once completed
        if (productActionsSection) productActionsSection.style.display = 'none';

        // Show the prominent "Send ad to Sales site" button
        const sendAdToSalesSiteBtn = document.getElementById('sendAdToSalesSiteBtn');
        if (sendAdToSalesSiteBtn) {
            sendAdToSalesSiteBtn.style.display = 'flex';
        }

        // Show the "Create ad on Sales site and Send by email" button (full width)
        const sendAdAndEmailBtn = document.getElementById('sendAdAndEmailBtn');
        if (sendAdAndEmailBtn) {
            sendAdAndEmailBtn.style.display = 'flex';
        }

        window.SalesApp.currentSalesText = result.salesText;
        window.SalesApp.currentStep = 3;

        if (typeof ProductIdentificationModule !== 'undefined') {
            ProductIdentificationModule.updateStepActions(window.SalesApp.currentStep);
        }
    },

    // Shared function to create item in sales site
    createItemInSalesSite: async function () {
        if (!window.SalesApp.currentAnalysis || !window.SalesApp.currentPricing || !window.SalesApp.currentSalesText) {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Please complete the analysis and generate pricing & sales text first.');
            }
            return;
        }

        try {
            const loading = document.getElementById('loading');
            const loadingText = document.getElementById('loadingText');

            if (loading) loading.style.display = 'block';
            if (loadingText) loadingText.textContent = 'Creating item in sales site...';

            const formData = new FormData();
            formData.append('analysis', window.SalesApp.currentAnalysis);
            formData.append('pricing', JSON.stringify(window.SalesApp.currentPricing));
            formData.append('salesText', window.SalesApp.currentSalesText);
            
            // Get product name from confirmedProductName field or stored value
            const confirmedProductNameEl = document.getElementById('confirmedProductName');
            const productName = (confirmedProductNameEl && confirmedProductNameEl.value.trim()) || 
                              window.SalesApp.confirmedProductName || 
                              'Unknown Product';
            formData.append('productName', productName);
            
            if (window.SalesApp.capturedImage) {
                formData.append('image', window.SalesApp.capturedImage, 'product.jpg');
            }

            const response = await fetch('/create-item', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error('Server error: ' + (errorData.error || 'Unknown error'));
            }

            const result = await response.json();

            if (result.success) {
                // Show item creation confirmation
                const itemDetailsEl = document.getElementById('itemDetails');
                if (itemDetailsEl) {
                    itemDetailsEl.textContent = `Item: ${result.item.title} | Price: €${result.item.price} | Status: ${result.item.isPublished ? 'Published' : 'Draft'}`;
                }

                const itemSection = document.getElementById('itemSection');
                if (itemSection) {
                    itemSection.style.display = 'block';
                    const results = document.getElementById('results');
                    if (results) results.scrollIntoView({ behavior: 'smooth' });
                }

                // Hide the button after successful creation
                const sendAdToSalesSiteBtn = document.getElementById('sendAdToSalesSiteBtn');
                if (sendAdToSalesSiteBtn) {
                    sendAdToSalesSiteBtn.style.display = 'none';
                }

                // Hide pricing and sales text sections after successful item creation
                const pricingSection = document.getElementById('pricingSection');
                const salesTextSection = document.getElementById('salesTextSection');
                if (pricingSection) pricingSection.style.display = 'none';
                if (salesTextSection) salesTextSection.style.display = 'none';

                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.showSuccess('Item created successfully in sales site!');
                }
            } else {
                throw new Error(result.error || 'Failed to create item');
            }

        } catch (error) {
            console.error('Item creation error:', error);
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Failed to create item: ' + error.message);
            }
        } finally {
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
        }
    },

    // Create item in sales site AND send email
    createItemAndSendEmail: async function () {
        if (!window.SalesApp.currentAnalysis || !window.SalesApp.currentPricing || !window.SalesApp.currentSalesText) {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Please complete the analysis and generate pricing & sales text first.');
            }
            return;
        }

        try {
            const loading = document.getElementById('loading');
            const loadingText = document.getElementById('loadingText');

            if (loading) loading.style.display = 'block';
            if (loadingText) loadingText.textContent = 'Creating item and sending email...';

            // Get product name from confirmedProductName field or stored value
            const confirmedProductNameEl = document.getElementById('confirmedProductName');
            const productName = (confirmedProductNameEl && confirmedProductNameEl.value.trim()) || 
                              window.SalesApp.confirmedProductName || 
                              'Unknown Product';

            // 1. Create item in sales site
            try {
                const formData = new FormData();
                formData.append('analysis', window.SalesApp.currentAnalysis);
                formData.append('pricing', JSON.stringify(window.SalesApp.currentPricing));
                formData.append('salesText', window.SalesApp.currentSalesText);
                formData.append('productName', productName);
                
                if (window.SalesApp.capturedImage) {
                    formData.append('image', window.SalesApp.capturedImage, 'product.jpg');
                }

                const createResponse = await fetch('/create-item', {
                    method: 'POST',
                    body: formData
                });

                if (!createResponse.ok) {
                    const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error('Server error: ' + (errorData.error || 'Unknown error'));
                }

                const createResult = await createResponse.json();

                if (createResult.success) {
                    // Show item creation confirmation
                    const itemDetailsEl = document.getElementById('itemDetails');
                    if (itemDetailsEl) {
                        itemDetailsEl.textContent = `Item: ${createResult.item.title} | Price: €${createResult.item.price} | Status: ${createResult.item.isPublished ? 'Published' : 'Draft'}`;
                    }

                    const itemSection = document.getElementById('itemSection');
                    if (itemSection) {
                        itemSection.style.display = 'block';
                    }

                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.showSuccess('Item created successfully in sales site!');
                    }
                } else {
                    throw new Error(createResult.error || 'Failed to create item');
                }
            } catch (error) {
                console.error('Item creation error:', error);
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.showError('Failed to create item: ' + error.message);
                }
                // Continue to email sending even if item creation fails
            }

            // 2. Send email
            try {
                const emailFormData = new FormData();
                emailFormData.append('pricing', JSON.stringify(window.SalesApp.currentPricing));
                emailFormData.append('salesText', window.SalesApp.currentSalesText);
                
                if (window.SalesApp.capturedImage) {
                    emailFormData.append('image', window.SalesApp.capturedImage, 'product.jpg');
                }
                
                emailFormData.append('productName', productName);

                if (loadingText) loadingText.textContent = 'Sending email...';

                const emailResponse = await fetch('/send-email', {
                    method: 'POST',
                    body: emailFormData
                });

                if (!emailResponse.ok) {
                    const errorText = await emailResponse.text();
                    throw new Error('Server error: ' + errorText);
                }

                const emailResult = await emailResponse.json();

                // Show email confirmation
                const emailSection = document.getElementById('emailSection');
                if (emailSection) {
                    emailSection.style.display = 'block';
                }

                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.showSuccess('Email sent successfully!');
                }

                // Hide the button after successful completion
                const sendAdAndEmailBtn = document.getElementById('sendAdAndEmailBtn');
                if (sendAdAndEmailBtn) {
                    sendAdAndEmailBtn.style.display = 'none';
                }

                // Hide the other "Send ad to Sales site" button too
                const sendAdToSalesSiteBtn = document.getElementById('sendAdToSalesSiteBtn');
                if (sendAdToSalesSiteBtn) {
                    sendAdToSalesSiteBtn.style.display = 'none';
                }

                // Scroll to results
                const results = document.getElementById('results');
                if (results) results.scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error('Email sending error:', error);
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.showError('Failed to send email: ' + error.message);
                }
            }

        } catch (error) {
            console.error('Create item and send email error:', error);
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Error: ' + error.message);
            }
        } finally {
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
        }
    },

    // Shared function to generate pricing and sales text
    generatePricingAndSalesText: async function () {
        if (!window.SalesApp.selectedAnalysis) {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Please identify the product and select a candidate first.');
            }
            return;
        }

        try {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('💰 Starting pricing and sales text generation...');
            }

            const loading = document.getElementById('loading');
            const loadingText = document.getElementById('loadingText');
            const hintInput = document.getElementById('hintInput');
            const additionalHintsInput = document.getElementById('additionalHintsInput');
            const confirmedProductNotes = document.getElementById('confirmedProductNotes');

            if (loading) loading.style.display = 'block';
            if (loadingText) loadingText.textContent = 'Generating pricing and sales text...';

            // Hide product identification section once pricing/sales text generation starts
            const productIdentificationSection = document.getElementById('productIdentificationSection');
            if (productIdentificationSection) {
                productIdentificationSection.style.display = 'none';
            }

            // Get confirmed product name (authoritative source)
            const confirmedProductNameEl = document.getElementById('confirmedProductName');
            const confirmedProductName = (confirmedProductNameEl && confirmedProductNameEl.value.trim()) || 
                                          window.SalesApp.confirmedProductName || null;

            // 1. Generate pricing
            const pricingResponse = await fetch('/generate-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis: window.SalesApp.selectedAnalysis,
                    userHint: hintInput ? hintInput.value.trim() || null : null,
                    confirmedProductName: confirmedProductName,
                    confirmedProductNotes: confirmedProductNotes ? confirmedProductNotes.value.trim() || null : null
                })
            });

            if (!pricingResponse.ok) {
                const errorText = await pricingResponse.text();
                throw new Error('Server error: ' + errorText);
            }

            const pricingResult = await pricingResponse.json();
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('✅ Pricing analysis completed');
            }

            if (typeof PricingModule !== 'undefined') {
                PricingModule.displayPricing(pricingResult);
            }

            // 2. Generate sales text
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('📝 Starting sales text generation...');
            }

            // Get additional hints (separate from confirmedProductNotes)
            const additionalHints = additionalHintsInput ? additionalHintsInput.value.trim() || null : null;
            
            // confirmedProductNotes will be passed separately to feature it prominently
            const confirmedProductNotesValue = confirmedProductNotes ? confirmedProductNotes.value.trim() || null : null;

            const salesTextResponse = await fetch('/generate-sales-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis: window.SalesApp.selectedAnalysis,
                    pricing: pricingResult.pricing,
                    userHint: hintInput ? hintInput.value.trim() || null : null,
                    confirmedProductName: confirmedProductName,
                    additionalHints: additionalHints,
                    confirmedProductNotes: confirmedProductNotesValue
                })
            });

            if (!salesTextResponse.ok) {
                const errorText = await salesTextResponse.text();
                throw new Error('Server error: ' + errorText);
            }

            const salesTextResult = await salesTextResponse.json();
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('✅ Sales text generation completed');
            }

            this.displaySalesText(salesTextResult);

        } catch (error) {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog(`❌ Pricing & sales text generation error: ${error.message}`);
            }
            console.error('Pricing & sales text generation error:', error);
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Failed to generate pricing & sales text: ' + error.message);
            }
        } finally {
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
        }
    },

    // Initialize sales text module
    init: function () {
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        const sendEmailBtn2 = document.getElementById('sendEmail2');
        const createItemBtn = document.getElementById('createItem');
        const sendAdToSalesSiteBtn = document.getElementById('sendAdToSalesSiteBtn');

        // Complete Analysis button (Generate Pricing & Sales Text)
        if (completeAnalysisBtn) {
            completeAnalysisBtn.addEventListener('click', async () => {
                await this.generatePricingAndSalesText();
            });
        }

        // Email functionality
        if (sendEmailBtn2) {
            sendEmailBtn2.addEventListener('click', async () => {
                if (!window.SalesApp.currentAnalysis || !window.SalesApp.currentPricing || !window.SalesApp.currentSalesText) {
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.showError('Please complete the analysis and generate pricing & sales text first.');
                    }
                    return;
                }

                try {
                    const loading = document.getElementById('loading');
                    const loadingText = document.getElementById('loadingText');

                    if (loading) loading.style.display = 'block';
                    if (loadingText) loadingText.textContent = 'Sending email...';

                    const formData = new FormData();
                    formData.append('pricing', JSON.stringify(window.SalesApp.currentPricing));
                    formData.append('salesText', window.SalesApp.currentSalesText);
                    
                    if (window.SalesApp.capturedImage) {
                        formData.append('image', window.SalesApp.capturedImage, 'product.jpg');
                    }
                    
                    // Get product name from confirmedProductName field or stored value
                    const confirmedProductNameEl = document.getElementById('confirmedProductName');
                    const productName = (confirmedProductNameEl && confirmedProductNameEl.value.trim()) || 
                                      window.SalesApp.confirmedProductName || 
                                      'Unknown Product';
                    formData.append('productName', productName);

                    const response = await fetch('/send-email', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('Server error: ' + errorText);
                    }

                    const result = await response.json();

                    // Show email confirmation
                    const emailSection = document.getElementById('emailSection');
                    if (emailSection) {
                        emailSection.style.display = 'block';
                        const results = document.getElementById('results');
                        if (results) results.scrollIntoView({ behavior: 'smooth' });
                    }

                } catch (error) {
                    console.error('Email sending error:', error);
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.showError('Failed to send email: ' + error.message);
                    }
                } finally {
                    const loading = document.getElementById('loading');
                    if (loading) loading.style.display = 'none';
                }
            });
        }

        // Create item functionality (from sales text section)
        if (createItemBtn) {
            createItemBtn.addEventListener('click', () => {
                this.createItemInSalesSite();
            });
        }

        // Prominent "Send ad to Sales site" button (in log section)
        if (sendAdToSalesSiteBtn) {
            sendAdToSalesSiteBtn.addEventListener('click', () => {
                this.createItemInSalesSite();
            });
            
            // Add hover effect
            sendAdToSalesSiteBtn.addEventListener('mouseenter', () => {
                sendAdToSalesSiteBtn.style.transform = 'translateY(-2px)';
                sendAdToSalesSiteBtn.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
            });
            sendAdToSalesSiteBtn.addEventListener('mouseleave', () => {
                sendAdToSalesSiteBtn.style.transform = 'translateY(0)';
                sendAdToSalesSiteBtn.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
            });
        }

        // "Create ad on Sales site and Send by email" button (full width)
        const sendAdAndEmailBtn = document.getElementById('sendAdAndEmailBtn');
        if (sendAdAndEmailBtn) {
            sendAdAndEmailBtn.addEventListener('click', async () => {
                await this.createItemAndSendEmail();
            });
            
            // Add hover effect
            sendAdAndEmailBtn.addEventListener('mouseenter', () => {
                sendAdAndEmailBtn.style.transform = 'translateY(-2px)';
                sendAdAndEmailBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            });
            sendAdAndEmailBtn.addEventListener('mouseleave', () => {
                sendAdAndEmailBtn.style.transform = 'translateY(0)';
                sendAdAndEmailBtn.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            });
        }
    }
};









