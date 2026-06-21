// Product identification module
window.ProductIdentificationModule = {
    // Function to update step actions
    updateStepActions: function (step) {
        const identifyProductBtn = document.getElementById('identifyProduct');
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        const productTitleSection = document.getElementById('productTitleSection');
        const stepActionsAfterResults = document.getElementById('stepActionsAfterResults');

        if (step === 1) {
            // Step 1: Show identify button
            if (identifyProductBtn) identifyProductBtn.style.display = 'inline-block';
            if (completeAnalysisBtn) completeAnalysisBtn.style.display = 'none';
            if (stepActionsAfterResults) stepActionsAfterResults.style.display = 'none';
            if (productTitleSection) productTitleSection.style.display = 'block';
            this.updateIdentifyButtonState();
        } else if (step === 2) {
            // Step 2: Hide identify button, complete analysis button shown via proceedToStep2
            if (identifyProductBtn) identifyProductBtn.style.display = 'none';
            if (productTitleSection) productTitleSection.style.display = 'none'; // Keep hidden after identification
        } else if (step === 3) {
            // Step 3: Hide both buttons, show results
            if (identifyProductBtn) identifyProductBtn.style.display = 'none';
            if (productTitleSection) productTitleSection.style.display = 'none';
        }
    },
    
    // Function to hide identify button when identification starts
    hideIdentifyButton: function () {
        const identifyProductBtn = document.getElementById('identifyProduct');
        const productIdentificationStart = document.getElementById('productIdentificationStart');
        if (identifyProductBtn) identifyProductBtn.style.display = 'none';
        if (productIdentificationStart) productIdentificationStart.style.display = 'none';
    },
    
    // Function to lock product name when confirmed
    lockProductName: function () {
        const confirmedProductName = document.getElementById('confirmedProductName');
        const confirmProductNameHeading = document.getElementById('confirmProductNameHeading');
        
        if (confirmedProductName) {
            confirmedProductName.disabled = true;
            confirmedProductName.style.backgroundColor = '#f8f9fa';
            confirmedProductName.style.cursor = 'not-allowed';
        }
        
        if (confirmProductNameHeading) {
            confirmProductNameHeading.textContent = '✅ Product Name Confirmed';
            confirmProductNameHeading.style.color = '#28a745';
        }
    },

    // Function to update identify button state
    updateIdentifyButtonState: function () {
        const identifyProductBtn = document.getElementById('identifyProduct');

        if (identifyProductBtn) {
            const hasImage = window.SalesApp.capturedImage !== null;
            identifyProductBtn.disabled = !hasImage;
        }
    },

    // Function to clear previous results
    clearResults: function () {
        const checkAndSetStyle = (el, styleProp, value) => {
            if (el) el.style[styleProp] = value;
            else if (el !== undefined) console.warn('clearResults: missing element for style change');
        };
        const checkAndSetText = (id, value = '') => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
            else console.warn('clearResults: missing element with id', id);
        };
        
        // Show queue section again when clearing results
        const queueSection = document.getElementById('queueSection');
        if (queueSection) {
            queueSection.style.display = 'block';
        }

        const results = document.getElementById('results');
        const productIdentificationSection = document.getElementById('productIdentificationSection');
        const productSelectionSection = document.getElementById('productSelectionSection');
        const pricingSection = document.getElementById('pricingSection');
        const salesTextSection = document.getElementById('salesTextSection');
        const emailSection = document.getElementById('emailSection');
        const itemSection = document.getElementById('itemSection');
        const additionalHintsSection = document.getElementById('additionalHintsSection');

        if (results) checkAndSetStyle(results, 'display', 'none');
        if (productIdentificationSection) checkAndSetStyle(productIdentificationSection, 'display', 'none');
        if (productSelectionSection) checkAndSetStyle(productSelectionSection, 'display', 'none');
        if (pricingSection) checkAndSetStyle(pricingSection, 'display', 'none');
        if (salesTextSection) checkAndSetStyle(salesTextSection, 'display', 'none');
        if (emailSection) checkAndSetStyle(emailSection, 'display', 'none');
        if (itemSection) checkAndSetStyle(itemSection, 'display', 'none');
        if (additionalHintsSection) checkAndSetStyle(additionalHintsSection, 'display', 'none');
        
        // Update content padding when results are hidden
        if (typeof UtilsModule !== 'undefined') {
            UtilsModule.updateContentPadding();
        }

        checkAndSetText('googleVisionLabel');
        checkAndSetText('googleVisionConfidence');
        checkAndSetText('detectedObjects');
        checkAndSetText('similarProducts');
        checkAndSetText('dominantColors');
        checkAndSetText('analysisText');
        checkAndSetText('newPrice');
        checkAndSetText('usedPrice');
        checkAndSetText('reasoning');
        checkAndSetText('salesText');
        checkAndSetText('additionalHintsInput');
        checkAndSetText('hintInput');

        // Clear product selection
        const productCandidates = document.getElementById('productCandidates');
        if (productCandidates) productCandidates.innerHTML = '';
        else console.warn('clearResults: missing productCandidates');

        window.SalesApp.selectedProductCandidate = null;
        const confirmProductBtn = document.getElementById('confirmProductBtn');
        if (confirmProductBtn) confirmProductBtn.disabled = true;

        // Clear form inputs and re-enable
        const productTitleInput = document.getElementById('productTitleInput');
        if (productTitleInput) {
            productTitleInput.value = '';
            productTitleInput.disabled = false;
            productTitleInput.style.opacity = '1';
        }
        const hintInput = document.getElementById('hintInput');
        if (hintInput) hintInput.value = '';
        
        // Clear product entry fields and reset locked state
        const confirmedProductName = document.getElementById('confirmedProductName');
        if (confirmedProductName) {
            confirmedProductName.value = '';
            confirmedProductName.disabled = false;
            confirmedProductName.style.backgroundColor = '';
            confirmedProductName.style.cursor = '';
        }
        const confirmedProductNotes = document.getElementById('confirmedProductNotes');
        if (confirmedProductNotes) confirmedProductNotes.value = '';
        
        // Reset heading
        const confirmProductNameHeading = document.getElementById('confirmProductNameHeading');
        if (confirmProductNameHeading) {
            confirmProductNameHeading.textContent = '📝 Confirm Product Name';
            confirmProductNameHeading.style.color = '#0074d9';
        }
        
        // Reset product entry section visibility
        const productEntrySection = document.getElementById('productEntrySection');
        if (productEntrySection) productEntrySection.style.display = 'none';
        
        // Reset product identification start section
        const productIdentificationStart = document.getElementById('productIdentificationStart');
        if (productIdentificationStart) productIdentificationStart.style.display = 'block';
        
        // Hide step actions after results
        const stepActionsAfterResults = document.getElementById('stepActionsAfterResults');
        if (stepActionsAfterResults) stepActionsAfterResults.style.display = 'none';
        
        // Hide product actions section (Generate Pricing button)
        const productActionsSection = document.getElementById('productActionsSection');
        if (productActionsSection) productActionsSection.style.display = 'none';
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        if (completeAnalysisBtn) {
            completeAnalysisBtn.style.display = 'none';
            completeAnalysisBtn.disabled = true;
        }
        
        // Hide "Send ad to Sales site" button
        const sendAdToSalesSiteBtn = document.getElementById('sendAdToSalesSiteBtn');
        if (sendAdToSalesSiteBtn) sendAdToSalesSiteBtn.style.display = 'none';

        window.SalesApp.currentStep = 1;
        window.SalesApp.currentAnalysis = null;
        window.SalesApp.currentPricing = null;
        window.SalesApp.currentResult = null;
        window.SalesApp.currentSalesText = null;
        this.updateStepActions(window.SalesApp.currentStep);
    },

    // Function to display product identification results
    displayProductIdentification: function (result) {
        const productData = result.productData;

        // Display Google Vision results
        const googleVisionLabel = document.getElementById('googleVisionLabel');
        const googleVisionConfidence = document.getElementById('googleVisionConfidence');
        const detectedObjects = document.getElementById('detectedObjects');
        const similarProducts = document.getElementById('similarProducts');
        const dominantColors = document.getElementById('dominantColors');
        
        if (productData.detectedObjects && productData.detectedObjects.length > 0) {
            if (googleVisionLabel) googleVisionLabel.textContent = `Detected Objects: ${productData.detectedObjects.join(', ')}`;
            if (detectedObjects) detectedObjects.textContent = `Objects: ${productData.detectedObjects.join(', ')}`;
        } else {
            if (googleVisionLabel) googleVisionLabel.textContent = '';
            if (detectedObjects) detectedObjects.textContent = '';
        }

        if (productData.confidence > 0) {
            if (googleVisionConfidence) googleVisionConfidence.textContent = `Confidence: ${Math.round(productData.confidence * 100)}%`;
        } else {
            if (googleVisionConfidence) googleVisionConfidence.textContent = '';
        }

        if (productData.similarProducts && productData.similarProducts.length > 0) {
            if (similarProducts) similarProducts.textContent = `Similar Products: ${productData.similarProducts.join(', ')}`;
        } else {
            if (similarProducts) similarProducts.textContent = '';
        }

        if (productData.dominantColors && productData.dominantColors.length > 0) {
            if (dominantColors) dominantColors.textContent = `Colors: ${productData.dominantColors.join(', ')}`;
        } else {
            if (dominantColors) dominantColors.textContent = '';
        }

        // Display Detailed Analysis
        document.getElementById('analysisText').innerText = result.analysis || '';

        // Keep expandable sections closed by default (do not auto-open)

        // Show webDetection if present
        if (productData.webDetection) {
            const webSection = document.getElementById('webDetectionExpando');
            if (webSection) webSection.style.display = 'block';
            // Best guess labels
            const bestGuessDiv = document.getElementById('webBestGuess');
            if (bestGuessDiv) {
                bestGuessDiv.innerHTML = '';
                if (productData.webDetection.bestGuessLabels && productData.webDetection.bestGuessLabels.length > 0) {
                    bestGuessDiv.innerHTML = '<b>Best Guess Labels:</b> ' + productData.webDetection.bestGuessLabels.map(l => l.label).join(', ');
                }
            }
            // Pages with matching images
            const pagesDiv = document.getElementById('webPages');
            if (pagesDiv) {
                pagesDiv.innerHTML = '';
                if (productData.webDetection.pagesWithMatchingImages && productData.webDetection.pagesWithMatchingImages.length > 0) {
                    pagesDiv.innerHTML = '<b>Pages with Matching Images:</b><ul>' + productData.webDetection.pagesWithMatchingImages.map(p => `<li><a href="${p.url}" target="_blank">${p.pageTitle || p.url}</a></li>`).join('') + '</ul>';
                }
            }
            // Visually similar images
            const similarDiv = document.getElementById('webSimilarImages');
            if (similarDiv) {
                similarDiv.innerHTML = '';
                if (productData.webDetection.visuallySimilarImages && productData.webDetection.visuallySimilarImages.length > 0) {
                    similarDiv.innerHTML = '<b>Visually Similar Images:</b><div style="display:flex;flex-wrap:wrap;gap:8px;">' + productData.webDetection.visuallySimilarImages.map(img => `<a href="${img.url}" target="_blank"><img src="${img.url}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;border:1px solid #ccc;"></a>`).join('') + '</div>';
                }
            }
        } else {
            const webDetectionExpando = document.getElementById('webDetectionExpando');
            if (webDetectionExpando) webDetectionExpando.style.display = 'none';
        }

        // Set Google Vision Summary
        document.getElementById('googleVisionSummary').innerText = result.googleVisionSummary || '';

        // Store the current result
        window.SalesApp.currentResult = result;

        // Handle product candidates if available
        // Show selection if we have candidates, otherwise show manual entry
        if (productData.productCandidates && productData.productCandidates.length >= 1) {
            this.displayProductCandidates(productData.productCandidates);
        }
        
        // Always proceed to show analysis and product entry
        this.proceedWithAnalysis(result);
    },

    // Function to display product candidates for selection
    displayProductCandidates: function (candidates) {
        const productCandidates = document.getElementById('productCandidates');
        const productSelectionSection = document.getElementById('productSelectionSection');
        const productIdentificationSection = document.getElementById('productIdentificationSection');
        const results = document.getElementById('results');
        const confirmProductBtn = document.getElementById('confirmProductBtn');

        if (productCandidates) {
            productCandidates.innerHTML = '';
            // Filter out candidates with empty or whitespace-only names
            // Sort to ensure vision_model is always first
            const filtered = candidates
                .filter(c => c.name && c.name.trim().length > 0)
                .sort((a, b) => {
                    if (a.source === 'vision_model') return -1;
                    if (b.source === 'vision_model') return 1;
                    return (b.confidence || 0) - (a.confidence || 0);
                });
            
            filtered.forEach((candidate, index) => {
                const candidateDiv = document.createElement('div');
                candidateDiv.className = 'product-candidate';
                const sourceLabel = candidate.source === 'vision_model' ? '🤖 Vision Model' : 
                                   candidate.source === 'object_detection' ? '🔍 Object Detection' :
                                   candidate.source === 'label_detection' ? '🏷️ Label Detection' :
                                   candidate.source === 'best_guess' ? '🌐 Web Best Guess' : '📊 API';
                candidateDiv.innerHTML = `
                    <input type="radio" name="productCandidate" id="candidate_${index}" value="${candidate.id}">
                    <div class="product-candidate-info">
                        <div class="product-candidate-name">${candidate.name}</div>
                        <div class="product-candidate-details">${sourceLabel}${candidate.description && candidate.description !== candidate.name ? ' • ' + candidate.description : ''}</div>
                    </div>
                `;
                candidateDiv.addEventListener('click', () => {
                    document.querySelectorAll('input[name="productCandidate"]').forEach(radio => { radio.checked = false; });
                    candidateDiv.querySelector('input').checked = true;
                    document.querySelectorAll('.product-candidate').forEach(div => { div.classList.remove('selected'); });
                    candidateDiv.classList.add('selected');
                    window.SalesApp.selectedProductCandidate = candidate;
                    if (confirmProductBtn) confirmProductBtn.disabled = false;
                });
                productCandidates.appendChild(candidateDiv);
            });
            
            // Auto-select the vision model candidate if available (it's always first after sorting)
            if (filtered.length > 0 && filtered[0].source === 'vision_model') {
                const firstCandidate = filtered[0];
                const firstRadio = productCandidates.querySelector(`#candidate_0`);
                const firstDiv = productCandidates.querySelector('.product-candidate');
                
                if (firstRadio && firstDiv) {
                    firstRadio.checked = true;
                    firstDiv.classList.add('selected');
                    window.SalesApp.selectedProductCandidate = firstCandidate;
                    if (confirmProductBtn) confirmProductBtn.disabled = false;
                }
            }
        }

        if (productSelectionSection) productSelectionSection.style.display = 'block';
        else console.warn('displayProductCandidates: productSelectionSection not found');
        if (productIdentificationSection) productIdentificationSection.style.display = 'block';
        else console.warn('displayProductCandidates: productIdentificationSection not found');
        if (results) {
            results.style.display = 'block';
            results.scrollIntoView({ behavior: 'smooth' });
            // Update content padding when results are shown
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.updateContentPadding();
            }
        }
        else console.warn('displayProductCandidates: results not found');
    },

    // Function to proceed with analysis after product selection
    proceedWithAnalysis: function (result) {
        const productIdentificationSection = document.getElementById('productIdentificationSection');
        const results = document.getElementById('results');

        if (productIdentificationSection) productIdentificationSection.style.display = 'block';
        if (results) {
            results.style.display = 'block';
            results.scrollIntoView({ behavior: 'smooth' });
            // Update content padding when results are shown
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.updateContentPadding();
            }
        }

        window.SalesApp.currentAnalysis = result.analysis;
        window.SalesApp.selectedAnalysis = result.analysis; // Set selectedAnalysis so the button works
        // Show the combined analysis (now called 'Detailed Analysis')
        if (result.analysis) {
            document.getElementById('analysisText').textContent = result.analysis;
        } else {
            document.getElementById('analysisText').textContent = '';
        }

        // Show product entry section (manual entry, or in addition to selection if candidates exist)
        this.showProductEntry(result);
        
        // Update Generate button visibility if product name is already filled
        const confirmedProductName = document.getElementById('confirmedProductName');
        if (confirmedProductName && confirmedProductName.value.trim()) {
            const productActionsSection = document.getElementById('productActionsSection');
            const completeAnalysisBtn = document.getElementById('completeAnalysis');
            if (productActionsSection && completeAnalysisBtn) {
                productActionsSection.style.display = 'block';
                completeAnalysisBtn.style.display = 'inline-block';
                completeAnalysisBtn.disabled = false;
            }
        }
    },

    // Function to show product entry section
    showProductEntry: function (result) {
        const productEntrySection = document.getElementById('productEntrySection');
        const confirmedProductName = document.getElementById('confirmedProductName');
        const productTitleInput = document.getElementById('productTitleInput');

        if (productEntrySection && confirmedProductName) {
            // Pre-populate the product name from the original title if available
            if (productTitleInput && productTitleInput.value.trim()) {
                confirmedProductName.value = productTitleInput.value.trim();
            }
            
            // Show the entry section
            productEntrySection.style.display = 'block';
        }
    },

    // Function to proceed to step 2 after product confirmation
    proceedToStep2: function () {
        const confirmedProductName = document.getElementById('confirmedProductName');
        if (!confirmedProductName || !confirmedProductName.value.trim()) {
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError('Please enter a product name to continue.');
            }
            return;
        }

        // Lock the product name
        this.lockProductName();

        window.SalesApp.currentStep = 2;
        this.updateStepActions(window.SalesApp.currentStep);
        
        // Show and enable the complete analysis button in Product Identification section
        const productActionsSection = document.getElementById('productActionsSection');
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        
        if (productActionsSection) {
            productActionsSection.style.display = 'block';
        }
        
        if (completeAnalysisBtn) {
            completeAnalysisBtn.disabled = false;
            completeAnalysisBtn.style.display = 'inline-block';
        }
        
        // Hide the step actions after results (if it exists, we're using the one in Product Identification now)
        const stepActionsAfterResults = document.getElementById('stepActionsAfterResults');
        if (stepActionsAfterResults) {
            stepActionsAfterResults.style.display = 'none';
        }

        // Store the confirmed product name
        window.SalesApp.confirmedProductName = confirmedProductName.value.trim();
        
        if (typeof UtilsModule !== 'undefined') {
            UtilsModule.addLog(`✅ Product confirmed: "${window.SalesApp.confirmedProductName}"`);
            UtilsModule.addLog('📊 Ready for pricing analysis. Click "Generate Pricing & Sales Text" to continue.');
        }
    },

    // Initialize product identification module
    init: function () {
        const identifyProductBtn = document.getElementById('identifyProduct');
        const productTitleInput = document.getElementById('productTitleInput');
        const confirmProductBtn = document.getElementById('confirmProductBtn');
        const skipSelectionBtn = document.getElementById('skipSelectionBtn');
        const confirmProductDetails = document.getElementById('confirmProductDetails');
        const editProductDetails = document.getElementById('editProductDetails');
        const resetBtn = document.getElementById('resetBtn');
        const resetBtn2 = document.getElementById('resetBtn2');

        // Identify Product button
        if (identifyProductBtn) {
            identifyProductBtn.addEventListener('click', async () => {
                const startTime = Date.now();
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog('🔍 User clicked Identify Product button');
                }

                if (!window.SalesApp.capturedImage) {
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.addLog('❌ No image captured');
                        UtilsModule.showError('Please capture or upload an image first.');
                    }
                    return;
                }

                // Hide queue section if starting single image process (queue mode not enabled)
                if (typeof QueueModule !== 'undefined' && QueueModule.isQueueModeEnabled && !QueueModule.isQueueModeEnabled()) {
                    const queueSection = document.getElementById('queueSection');
                    if (queueSection) {
                        queueSection.style.display = 'none';
                    }
                }

                // Hide Identify Product button once identification flow starts
                this.hideIdentifyButton();

                if (typeof UtilsModule !== 'undefined') {
                    const titleText = productTitleInput && productTitleInput.value.trim() ? productTitleInput.value.trim() : 'None';
                    UtilsModule.addLog(`📝 Product title: "${titleText}"`);
                    UtilsModule.addLog('🔍 Starting parallel analyses: Google Vision API and Vision Model...');
                }

                try {
                    const loading = document.getElementById('loading');
                    const loadingText = document.getElementById('loadingText');
                    const hintInput = document.getElementById('hintInput');

                    if (loading) loading.style.display = 'block';
                    if (loadingText) loadingText.textContent = '🔍 Running parallel analyses: Google Vision API & Vision Model...';

                    // Hide product title section once Identify Product is clicked
                    const productTitleSection = document.getElementById('productTitleSection');
                    if (productTitleSection) productTitleSection.style.display = 'none';

                    const formData = new FormData();
                    formData.append('image', window.SalesApp.capturedImage, 'object.jpg');
                    if (productTitleInput && productTitleInput.value.trim()) {
                        formData.append('productTitle', productTitleInput.value.trim());
                    }
                    if (hintInput && hintInput.value.trim()) {
                        formData.append('hint', hintInput.value.trim());
                    }

                    console.log('📤 Sending request to /identify-product endpoint');
                    const response = await fetch('/identify-product', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                        console.error('❌ Server error:', errorData);
                        throw new Error('Server error: ' + (errorData.error || 'Unknown error'));
                    }

                    const result = await response.json();
                    const totalTime = Date.now() - startTime;
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.addLog(`✅ Product identification completed in ${totalTime}ms`);
                        UtilsModule.addLog('📊 Result received');
                    }

                    this.displayProductIdentification(result);

                } catch (error) {
                    const totalTime = Date.now() - startTime;
                    console.error(`❌ Product identification failed after ${totalTime}ms:`, error);
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.showError('Failed to identify product: ' + error.message);
                    }
                } finally {
                    const loading = document.getElementById('loading');
                    if (loading) loading.style.display = 'none';
                }
            });
        }

        // Product title input listener
        if (productTitleInput) {
            productTitleInput.addEventListener('input', () => this.updateIdentifyButtonState());
            productTitleInput.addEventListener('keyup', () => this.updateIdentifyButtonState());
        }

        // Show Generate Pricing button when product name is entered
        const confirmedProductName = document.getElementById('confirmedProductName');
        const productActionsSection = document.getElementById('productActionsSection');
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        
        const updateGenerateButtonVisibility = () => {
            if (confirmedProductName && productActionsSection && completeAnalysisBtn) {
                const hasProductName = confirmedProductName.value.trim().length > 0;
                if (hasProductName) {
                    productActionsSection.style.display = 'block';
                    completeAnalysisBtn.style.display = 'inline-block';
                    completeAnalysisBtn.disabled = false;
                } else {
                    productActionsSection.style.display = 'none';
                    completeAnalysisBtn.style.display = 'none';
                }
            }
        };
        
        // Product selection event listeners
        if (confirmProductBtn) {
            confirmProductBtn.addEventListener('click', async () => {
                if (window.SalesApp.selectedProductCandidate && window.SalesApp.currentResult) {
                    const productSelectionSection = document.getElementById('productSelectionSection');
                    const hintInput = document.getElementById('hintInput');

                    if (productSelectionSection) productSelectionSection.style.display = 'none';
                    // Set the selected product name in the manual entry field
                    if (confirmedProductName) {
                        confirmedProductName.value = window.SalesApp.selectedProductCandidate.name;
                        // Lock the product name since it was selected from candidates
                        this.lockProductName();
                    }
                    const productIdentificationDetails = document.getElementById('productIdentificationDetails');
                    if (productIdentificationDetails) productIdentificationDetails.open = false;

                    // Generate detailed analysis using the candidate and vision data
                    try {
                        const loading = document.getElementById('loading');
                        const loadingText = document.getElementById('loadingText');

                        if (loading) loading.style.display = 'block';
                        if (loadingText) loadingText.textContent = 'Generating detailed analysis...';

                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog('🔍 Generating detailed analysis for selected product...');
                            UtilsModule.addLog(`📦 Selected product: "${window.SalesApp.selectedProductCandidate.name}"`);
                        }

                        const analysisResponse = await fetch('/generate-analysis', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                candidate: window.SalesApp.selectedProductCandidate,
                                googleVisionData: window.SalesApp.currentResult.productData,
                                userHint: hintInput ? hintInput.value.trim() || null : null
                            })
                        });

                        if (!analysisResponse.ok) {
                            const errorText = await analysisResponse.text();
                            throw new Error('Server error: ' + errorText);
                        }

                        const analysisResult = await analysisResponse.json();
                        window.SalesApp.selectedAnalysis = analysisResult.analysis;
                        
                        // Log the detailed analysis result
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog('✅ Detailed analysis generated successfully');
                            UtilsModule.addLog('📋 Analysis result:');
                            // Split long analysis into multiple log entries if needed
                            const analysisLines = analysisResult.analysis.split('\n');
                            analysisLines.forEach(line => {
                                if (line.trim()) {
                                    UtilsModule.addLog(`   ${line.trim()}`);
                                }
                            });
                        }
                        
                        // Optionally still update #analysisText (remove this line if you don't want to update it)
                        // document.getElementById('analysisText').innerText = window.SalesApp.selectedAnalysis;
                    } catch (error) {
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.showError('Failed to generate detailed analysis: ' + error.message);
                        }
                        window.SalesApp.selectedAnalysis = null;
                    } finally {
                        const loading = document.getElementById('loading');
                        if (loading) loading.style.display = 'none';
                    }
                    
                    // Proceed to step 2 and show Generate Pricing button
                    window.SalesApp.currentStep = 2;
                    this.updateStepActions(window.SalesApp.currentStep);
                    
                    const productActionsSection = document.getElementById('productActionsSection');
                    const completeAnalysisBtn = document.getElementById('completeAnalysis');
                    if (productActionsSection && completeAnalysisBtn) {
                        productActionsSection.style.display = 'block';
                        completeAnalysisBtn.style.display = 'inline-block';
                        completeAnalysisBtn.disabled = false;
                    }
                    
                    // Store the confirmed product name
                    if (confirmedProductName && confirmedProductName.value.trim()) {
                        window.SalesApp.confirmedProductName = confirmedProductName.value.trim();
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog(`✅ Product confirmed: "${window.SalesApp.confirmedProductName}"`);
                        }
                    }
                    
                    this.proceedWithAnalysis({ ...window.SalesApp.currentResult, analysis: window.SalesApp.selectedAnalysis });
                    
                    // Automatically generate pricing and sales text after analysis is complete
                    if (typeof SalesTextModule !== 'undefined') {
                        await SalesTextModule.generatePricingAndSalesText();
                    }
                }
            });
        }

        if (skipSelectionBtn) {
            skipSelectionBtn.addEventListener('click', async () => {
                if (window.SalesApp.currentResult) {
                    const productSelectionSection = document.getElementById('productSelectionSection');
                    const hintInput = document.getElementById('hintInput');

                    if (productSelectionSection) productSelectionSection.style.display = 'none';
                    const productIdentificationDetails = document.getElementById('productIdentificationDetails');
                    if (productIdentificationDetails) productIdentificationDetails.open = false;

                    // Use the first candidate or detected object as the analysis
                    const productData = window.SalesApp.currentResult.productData;
                    let candidate = null;
                    if (productData.productCandidates && productData.productCandidates.length > 0) {
                        candidate = productData.productCandidates[0];
                    } else if (productData.detectedObjects && productData.detectedObjects.length > 0) {
                        candidate = { name: productData.detectedObjects[0], description: productData.detectedObjects[0] };
                    } else {
                        candidate = { name: 'Unknown product', description: 'Unknown product' };
                    }

                    try {
                        const loading = document.getElementById('loading');
                        const loadingText = document.getElementById('loadingText');

                        if (loading) loading.style.display = 'block';
                        if (loadingText) loadingText.textContent = 'Generating detailed analysis...';

                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog('🔍 Generating detailed analysis (skipped selection)...');
                            UtilsModule.addLog(`📦 Using product: "${candidate.name}"`);
                        }

                        const analysisResponse = await fetch('/generate-analysis', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                candidate: candidate,
                                googleVisionData: productData,
                                userHint: hintInput ? hintInput.value.trim() || null : null
                            })
                        });

                        if (!analysisResponse.ok) {
                            const errorText = await analysisResponse.text();
                            throw new Error('Server error: ' + errorText);
                        }

                        const analysisResult = await analysisResponse.json();
                        window.SalesApp.selectedAnalysis = analysisResult.analysis;
                        
                        // Log the detailed analysis result
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog('✅ Detailed analysis generated successfully');
                            UtilsModule.addLog('📋 Analysis result:');
                            // Split long analysis into multiple log entries if needed
                            const analysisLines = analysisResult.analysis.split('\n');
                            analysisLines.forEach(line => {
                                if (line.trim()) {
                                    UtilsModule.addLog(`   ${line.trim()}`);
                                }
                            });
                        }
                        
                        // Optionally still update #analysisText (remove this line if you don't want to update it)
                        // document.getElementById('analysisText').innerText = window.SalesApp.selectedAnalysis;
                        
                        // Populate the product name field with the first candidate
                        const confirmedProductName = document.getElementById('confirmedProductName');
                        if (confirmedProductName && candidate) {
                            confirmedProductName.value = candidate.name;
                            // Lock the product name since it was auto-selected
                            this.lockProductName();
                        }
                    } catch (error) {
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.showError('Failed to generate detailed analysis: ' + error.message);
                        }
                        window.SalesApp.selectedAnalysis = null;
                    } finally {
                        const loading = document.getElementById('loading');
                        if (loading) loading.style.display = 'none';
                    }
                    
                    // Proceed to step 2 and show Generate Pricing button
                    window.SalesApp.currentStep = 2;
                    this.updateStepActions(window.SalesApp.currentStep);
                    
                    const productActionsSection = document.getElementById('productActionsSection');
                    const completeAnalysisBtn = document.getElementById('completeAnalysis');
                    if (productActionsSection && completeAnalysisBtn) {
                        productActionsSection.style.display = 'block';
                        completeAnalysisBtn.style.display = 'inline-block';
                        completeAnalysisBtn.disabled = false;
                    }
                    
                    // Store the confirmed product name
                    const confirmedProductName = document.getElementById('confirmedProductName');
                    if (confirmedProductName && confirmedProductName.value.trim()) {
                        window.SalesApp.confirmedProductName = confirmedProductName.value.trim();
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog(`✅ Product confirmed: "${window.SalesApp.confirmedProductName}"`);
                            UtilsModule.addLog('📊 Ready for pricing analysis. Click "Generate Pricing & Sales Text" to continue.');
                        }
                    }
                    
                    this.proceedWithAnalysis({ ...window.SalesApp.currentResult, analysis: window.SalesApp.selectedAnalysis });
                    
                    // Automatically generate pricing and sales text after analysis is complete
                    if (typeof SalesTextModule !== 'undefined') {
                        await SalesTextModule.generatePricingAndSalesText();
                    }
                }
            });
        }

        // Use manual entry button
        const useManualEntryBtn = document.getElementById('useManualEntryBtn');
        if (useManualEntryBtn) {
            useManualEntryBtn.addEventListener('click', () => {
                const productSelectionSection = document.getElementById('productSelectionSection');
                if (productSelectionSection) productSelectionSection.style.display = 'none';
            });
        }
        
        if (confirmedProductName) {
            confirmedProductName.addEventListener('input', updateGenerateButtonVisibility);
            confirmedProductName.addEventListener('blur', async () => {
                updateGenerateButtonVisibility();
                
                // If product name was manually entered and is different from detected, regenerate analysis
                if (confirmedProductName.value.trim() && 
                    window.SalesApp.currentResult && 
                    window.SalesApp.currentResult.productData) {
                    
                    const productName = confirmedProductName.value.trim();
                    const detectedProduct = window.SalesApp.selectedProductCandidate?.name || 
                                          (window.SalesApp.currentResult.productData.productCandidates?.[0]?.name);
                    
                    // Only regenerate if the manually entered name differs significantly from detected
                    if (!detectedProduct || !productName.toLowerCase().includes(detectedProduct.toLowerCase())) {
                        const hintInput = document.getElementById('hintInput');
                        
                        // Create a candidate from the manual entry
                        const manualCandidate = {
                            name: productName,
                            description: productName,
                            source: 'manual_entry'
                        };
                        
                        try {
                            if (typeof UtilsModule !== 'undefined') {
                                UtilsModule.addLog(`🔄 Regenerating analysis for: "${productName}"`);
                            }
                            
                            const analysisResponse = await fetch('/generate-analysis', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    candidate: manualCandidate,
                                    googleVisionData: window.SalesApp.currentResult.productData,
                                    userHint: hintInput ? hintInput.value.trim() || null : null
                                })
                            });
                            
                            if (analysisResponse.ok) {
                                const analysisResult = await analysisResponse.json();
                                window.SalesApp.selectedAnalysis = analysisResult.analysis;
                                window.SalesApp.currentAnalysis = analysisResult.analysis;
                                
                                // Update the analysis text display
                                const analysisTextEl = document.getElementById('analysisText');
                                if (analysisTextEl) {
                                    analysisTextEl.textContent = analysisResult.analysis;
                                }
                                
                                // Update the result with new analysis
                                window.SalesApp.currentResult = {
                                    ...window.SalesApp.currentResult,
                                    analysis: analysisResult.analysis
                                };
                                
                                if (typeof UtilsModule !== 'undefined') {
                                    UtilsModule.addLog('✅ Analysis updated for manual entry');
                                }
                            }
                        } catch (error) {
                            console.error('Failed to regenerate analysis on blur:', error);
                            // Don't show error to user on blur - it's non-critical
                        }
                    }
                }
            });
            confirmedProductName.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter' && confirmedProductName.value.trim()) {
                    e.preventDefault();
                    // Generate new analysis based on manual entry if we have image data
                    if (window.SalesApp.currentResult && window.SalesApp.currentResult.productData) {
                        const productName = confirmedProductName.value.trim();
                        const hintInput = document.getElementById('hintInput');
                        
                        // Create a candidate from the manual entry
                        const manualCandidate = {
                            name: productName,
                            description: productName,
                            source: 'manual_entry'
                        };
                        
                        try {
                            const loading = document.getElementById('loading');
                            const loadingText = document.getElementById('loadingText');
                            
                            if (loading) loading.style.display = 'block';
                            if (loadingText) loadingText.textContent = 'Generating analysis for manually entered product...';
                            
                            if (typeof UtilsModule !== 'undefined') {
                                UtilsModule.addLog('🔍 Generating analysis for manually entered product...');
                                UtilsModule.addLog(`📦 Product: "${productName}"`);
                            }
                            
                            const analysisResponse = await fetch('/generate-analysis', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    candidate: manualCandidate,
                                    googleVisionData: window.SalesApp.currentResult.productData,
                                    userHint: hintInput ? hintInput.value.trim() || null : null
                                })
                            });
                            
                            if (!analysisResponse.ok) {
                                const errorText = await analysisResponse.text();
                                throw new Error('Server error: ' + errorText);
                            }
                            
                            const analysisResult = await analysisResponse.json();
                            window.SalesApp.selectedAnalysis = analysisResult.analysis;
                            
                            // Update the analysis text display
                            const analysisTextEl = document.getElementById('analysisText');
                            if (analysisTextEl) {
                                analysisTextEl.textContent = analysisResult.analysis;
                            }
                            
                            // Update current analysis
                            window.SalesApp.currentAnalysis = analysisResult.analysis;
                            
                            if (typeof UtilsModule !== 'undefined') {
                                UtilsModule.addLog('✅ Analysis generated for manually entered product');
                            }
                            
                            // Update the result with new analysis
                            window.SalesApp.currentResult = {
                                ...window.SalesApp.currentResult,
                                analysis: analysisResult.analysis
                            };
                            
                        } catch (error) {
                            console.error('Failed to generate analysis for manual entry:', error);
                            if (typeof UtilsModule !== 'undefined') {
                                UtilsModule.showError('Failed to generate analysis: ' + error.message);
                            }
                        } finally {
                            const loading = document.getElementById('loading');
                            if (loading) loading.style.display = 'none';
                        }
                    }
                    
                    // Lock the product name and proceed to step 2
                    this.lockProductName();
                    this.proceedToStep2();
                }
            });
        }

        if (editProductDetails) {
            editProductDetails.addEventListener('click', () => {
                const confirmedProductName = document.getElementById('confirmedProductName');
                if (confirmedProductName) {
                    confirmedProductName.focus();
                    confirmedProductName.select();
                }
            });
        }

        // Reset button functionality
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.clearResults();
                if (typeof CameraModule !== 'undefined') {
                    CameraModule.stopCamera();
                    CameraModule.resetCameraContainerToVideo();
                    CameraModule.showCameraButtons();
                }
                const cameraPlaceholder = document.getElementById('cameraPlaceholder');
                if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
                this.updateIdentifyButtonState(); // Reset button state
            });
        }

        if (resetBtn2) {
            resetBtn2.addEventListener('click', () => {
                this.clearResults();
                if (typeof CameraModule !== 'undefined') {
                    CameraModule.stopCamera();
                    CameraModule.resetCameraContainerToVideo();
                    CameraModule.showCameraButtons();
                }
                const cameraPlaceholder = document.getElementById('cameraPlaceholder');
                if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
                this.updateIdentifyButtonState(); // Reset button state
            });
        }
    }
};








