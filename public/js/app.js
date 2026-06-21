document.addEventListener('DOMContentLoaded', function () {
    let stream = null;
    let capturedImage = null;
    let currentStep = 1;
    let currentAnalysis = null;
    let currentPricing = null;
    let currentResult = null;
    let currentSalesText = null;
    let llmStatus = null;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraContainer = document.getElementById('cameraContainer');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const startCameraBtn = document.getElementById('startCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const uploadPhotoBtn = document.getElementById('uploadPhoto');
    const fileInput = document.getElementById('fileInput');

    // Additional camera buttons in results section
    const startCameraBtn2 = document.getElementById('startCamera2');
    const capturePhotoBtn2 = document.getElementById('capturePhoto2');
    const uploadPhotoBtn2 = document.getElementById('uploadPhoto2');
    const fileInput2 = document.getElementById('fileInput2');
    const productTitleInput = document.getElementById('productTitleInput');
    const hintInput = document.getElementById('hintInput');
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loadingText');
    const results = document.getElementById('results');

    // Step elements
    const identifyProductBtn = document.getElementById('identifyProduct');
    const completeAnalysisBtn = document.getElementById('completeAnalysis');
    const sendEmailBtn = document.getElementById('sendEmail');
    const sendEmailBtn2 = document.getElementById('sendEmail2');
    const createItemBtn = document.getElementById('createItem');
    const resetBtn2 = document.getElementById('resetBtn2');

    // Result sections
    const productIdentificationSection = document.getElementById('productIdentificationSection');
    const pricingSection = document.getElementById('pricingSection');
    const salesTextSection = document.getElementById('salesTextSection');
    const emailSection = document.getElementById('emailSection');
    const itemSection = document.getElementById('itemSection');
    const additionalHintsSection = document.getElementById('additionalHintsSection');
    const hintSection = document.getElementById('hintSection');
    const resetBtn = document.getElementById('resetBtn');

    // Product selection elements
    const productSelectionSection = document.getElementById('productSelectionSection');
    const productCandidates = document.getElementById('productCandidates');
    const confirmProductBtn = document.getElementById('confirmProductBtn');
    const skipSelectionBtn = document.getElementById('skipSelectionBtn');

    let selectedProductCandidate = null;

    // Add a variable to store the selected analysis for pricing/sales text
    let selectedAnalysis = null;



    // Function to update identify button state
    function updateIdentifyButtonState() {
        const hasImage = capturedImage !== null;
        const hasTitle = productTitleInput && productTitleInput.value.trim() !== '';
        identifyProductBtn.disabled = !(hasImage && hasTitle);
    }

    // Function to update step actions
    function updateStepActions(step) {
        const identifyProductBtn = document.getElementById('identifyProduct');
        const completeAnalysisBtn = document.getElementById('completeAnalysis');
        const productTitleSection = document.getElementById('productTitleSection');

        if (step === 1) {
            // Step 1: Show identify button
            identifyProductBtn.style.display = 'inline-block';
            if (completeAnalysisBtn) completeAnalysisBtn.style.display = 'none';
            productTitleSection.style.display = 'block';
            updateIdentifyButtonState();
        } else if (step === 2) {
            // Step 2: Hide identify button, show complete analysis button
            identifyProductBtn.style.display = 'none';
            if (completeAnalysisBtn) {
                completeAnalysisBtn.style.display = 'inline-block';
                completeAnalysisBtn.disabled = false;
            }
            // Keep product title section visible but disabled
            productTitleSection.style.display = 'block';
            if (productTitleInput) {
                productTitleInput.disabled = true;
                productTitleInput.style.opacity = '0.6';
            }
        } else if (step === 3) {
            // Step 3: Hide both buttons, show results
            identifyProductBtn.style.display = 'none';
            if (completeAnalysisBtn) completeAnalysisBtn.style.display = 'none';
            productTitleSection.style.display = 'block';
            if (productTitleInput) {
                productTitleInput.disabled = true;
                productTitleInput.style.opacity = '0.6';
            }
        }
    }

    // Function to stop camera
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.style.display = 'none';
        cameraContainer.classList.remove('has-image');
        cameraContainer.classList.remove('camera-active');
        startCameraBtn.textContent = 'Start Camera';
        startCameraBtn2.textContent = 'Start Camera';
        if (capturePhotoBtn) capturePhotoBtn.disabled = true;
        if (capturePhotoBtn2) capturePhotoBtn2.disabled = true;
    }

    // Function to hide camera buttons after photo capture
    function hideCameraButtons() {
        startCameraBtn.style.display = 'none';
        capturePhotoBtn.style.display = 'none';
        uploadPhotoBtn.style.display = 'none';
        startCameraBtn2.style.display = 'none';
        capturePhotoBtn2.style.display = 'none';
        uploadPhotoBtn2.style.display = 'none';
        // Button visibility is handled by updateStepActions
    }

    // Function to show camera buttons
    function showCameraButtons() {
        startCameraBtn.style.display = 'inline-block';
        capturePhotoBtn.style.display = 'inline-block';
        uploadPhotoBtn.style.display = 'inline-block';
        startCameraBtn2.style.display = 'inline-block';
        capturePhotoBtn2.style.display = 'inline-block';
        uploadPhotoBtn2.style.display = 'inline-block';
        // Button visibility is handled by updateStepActions
    }

    // Function to show error messages
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;

        const content = document.querySelector('.content');
        content.insertBefore(errorDiv, content.firstChild);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Function to add logs to the live log section
    function addLog(message, type = 'info') {
        const logSection = document.getElementById('logSection');
        const logContent = document.getElementById('logContent');
        const logDetails = document.getElementById('logDetails');

        if (logSection && logContent) {
            // Show the log section
            logSection.style.display = 'block';

            // Store current open state
            const wasOpen = logDetails ? logDetails.open : false;

            // Add timestamp and format the message
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}\n`;

            // Add to log content
            logContent.textContent += logEntry;

            // Explicitly keep it closed if it wasn't open by user
            // This prevents auto-expansion when content changes
            if (logDetails && !wasOpen) {
                logDetails.open = false;
            }

            // Auto-scroll to bottom only if already expanded
            if (logDetails && logDetails.open) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        }

        // Also log to console
        console.log(message);
    }

    // Function to clear previous results
    function clearResults() {
        const checkAndSetStyle = (el, styleProp, value) => {
            if (el) el.style[styleProp] = value;
            else if (el !== undefined) console.warn('clearResults: missing element for style change');
        };
        const checkAndSetText = (id, value = '') => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
            else console.warn('clearResults: missing element with id', id);
        };
        if (typeof results !== 'undefined') checkAndSetStyle(results, 'display', 'none');
        if (typeof productIdentificationSection !== 'undefined') checkAndSetStyle(productIdentificationSection, 'display', 'none');
        if (typeof productSelectionSection !== 'undefined') checkAndSetStyle(productSelectionSection, 'display', 'none');
        if (typeof pricingSection !== 'undefined') checkAndSetStyle(pricingSection, 'display', 'none');
        if (typeof salesTextSection !== 'undefined') checkAndSetStyle(salesTextSection, 'display', 'none');
        if (typeof emailSection !== 'undefined') checkAndSetStyle(emailSection, 'display', 'none');
        if (typeof itemSection !== 'undefined') checkAndSetStyle(itemSection, 'display', 'none');
        if (typeof additionalHintsSection !== 'undefined') checkAndSetStyle(additionalHintsSection, 'display', 'none');
        checkAndSetText('productSummary');
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
        if (productCandidates) productCandidates.innerHTML = '';
        else console.warn('clearResults: missing productCandidates');
        selectedProductCandidate = null;
        if (confirmProductBtn) confirmProductBtn.disabled = true;

        // Clear form inputs and re-enable
        if (productTitleInput) {
            productTitleInput.value = '';
            productTitleInput.disabled = false;
            productTitleInput.style.opacity = '1';
        }
        if (hintInput) hintInput.value = '';

        currentStep = 1;
        currentAnalysis = null;
        currentPricing = null;
        currentResult = null;
        currentSalesText = null;
        updateStepActions(currentStep);
    }

    // Function to display product identification results
    function displayProductIdentification(result) {
        const productData = result.productData;

        // Display product summary
        if (productData.detectedObjects.length > 0) {
            document.getElementById('productSummary').textContent = productData.detectedObjects[0];
        } else if (productData.similarProducts.length > 0) {
            document.getElementById('productSummary').textContent = productData.similarProducts[0];
        } else {
            document.getElementById('productSummary').textContent = 'Product identified';
        }

        // Display Google Vision results
        if (productData.detectedObjects.length > 0) {
            document.getElementById('googleVisionLabel').textContent = `Detected Objects: ${productData.detectedObjects.join(', ')}`;
        }

        if (productData.confidence > 0) {
            document.getElementById('googleVisionConfidence').textContent = `Confidence: ${Math.round(productData.confidence * 100)}%`;
        }

        if (productData.detectedObjects.length > 0) {
            document.getElementById('detectedObjects').textContent = `Objects: ${productData.detectedObjects.join(', ')}`;
        }

        if (productData.similarProducts.length > 0) {
            document.getElementById('similarProducts').textContent = `Similar Products: ${productData.similarProducts.join(', ')}`;
        }

        if (productData.dominantColors.length > 0) {
            document.getElementById('dominantColors').textContent = `Colors: ${productData.dominantColors.join(', ')}`;
        }

        // Display Detailed Analysis
        document.getElementById('analysisText').innerText = result.analysis || '';

        // Show webDetection if present
        if (productData.webDetection) {
            const webSection = document.getElementById('webDetectionExpando');
            webSection.style.display = 'block';
            // Best guess labels
            const bestGuessDiv = document.getElementById('webBestGuess');
            bestGuessDiv.innerHTML = '';
            if (productData.webDetection.bestGuessLabels && productData.webDetection.bestGuessLabels.length > 0) {
                bestGuessDiv.innerHTML = '<b>Best Guess Labels:</b> ' + productData.webDetection.bestGuessLabels.map(l => l.label).join(', ');
            }
            // Pages with matching images
            const pagesDiv = document.getElementById('webPages');
            pagesDiv.innerHTML = '';
            if (productData.webDetection.pagesWithMatchingImages && productData.webDetection.pagesWithMatchingImages.length > 0) {
                pagesDiv.innerHTML = '<b>Pages with Matching Images:</b><ul>' + productData.webDetection.pagesWithMatchingImages.map(p => `<li><a href="${p.url}" target="_blank">${p.pageTitle || p.url}</a></li>`).join('') + '</ul>';
            }
            // Visually similar images
            const similarDiv = document.getElementById('webSimilarImages');
            similarDiv.innerHTML = '';
            if (productData.webDetection.visuallySimilarImages && productData.webDetection.visuallySimilarImages.length > 0) {
                similarDiv.innerHTML = '<b>Visually Similar Images:</b><div style="display:flex;flex-wrap:wrap;gap:8px;">' + productData.webDetection.visuallySimilarImages.map(img => `<a href="${img.url}" target="_blank"><img src="${img.url}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;border:1px solid #ccc;"></a>`).join('') + '</div>';
            }
        } else {
            document.getElementById('webDetectionExpando').style.display = 'none';
        }

        // Set Google Vision Summary
        document.getElementById('googleVisionSummary').innerText = result.googleVisionSummary || '';

        // Store the current result
        currentResult = result;

        // Handle product candidates if available
        if (productData.productCandidates && productData.productCandidates.length > 1) {
            displayProductCandidates(productData.productCandidates);
        } else {
            // No multiple candidates, proceed normally
            proceedWithAnalysis(result);
        }
    }

    // Function to display product candidates for selection
    function displayProductCandidates(candidates) {
        productCandidates.innerHTML = '';
        // Filter out candidates with empty or whitespace-only names
        const filtered = candidates.filter(c => c.name && c.name.trim().length > 0);
        filtered.forEach((candidate, index) => {
            const candidateDiv = document.createElement('div');
            candidateDiv.className = 'product-candidate';
            candidateDiv.innerHTML = `
        <input type="radio" name="productCandidate" id="candidate_${index}" value="${candidate.id}">
        <div class="product-candidate-info">
          <div class="product-candidate-name">${candidate.name}</div>
          <div class="product-candidate-details">${candidate.description}</div>
        </div>
      `;
            candidateDiv.addEventListener('click', () => {
                document.querySelectorAll('input[name="productCandidate"]').forEach(radio => { radio.checked = false; });
                candidateDiv.querySelector('input').checked = true;
                document.querySelectorAll('.product-candidate').forEach(div => { div.classList.remove('selected'); });
                candidateDiv.classList.add('selected');
                selectedProductCandidate = candidate;
                if (confirmProductBtn) confirmProductBtn.disabled = false;
            });
            productCandidates.appendChild(candidateDiv);
        });
        if (productSelectionSection) productSelectionSection.style.display = 'block';
        else console.warn('displayProductCandidates: productSelectionSection not found');
        if (productIdentificationSection) productIdentificationSection.style.display = 'block';
        else console.warn('displayProductCandidates: productIdentificationSection not found');
        if (results) {
            results.style.display = 'block';
            // Update content padding when results are shown
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.updateContentPadding();
            }
        }
        else console.warn('displayProductCandidates: results not found');
        results && results.scrollIntoView({ behavior: 'smooth' });
    }

    // Function to proceed with analysis after product selection
    function proceedWithAnalysis(result) {
        productIdentificationSection.style.display = 'block';
        results.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth' });
        // Update content padding when results are shown
        if (typeof UtilsModule !== 'undefined') {
            UtilsModule.updateContentPadding();
        }

        currentAnalysis = result.analysis;
        selectedAnalysis = result.analysis; // Set selectedAnalysis so the button works
        // Show the combined analysis (now called 'Detailed Analysis')
        if (result.analysis) {
            document.getElementById('analysisText').textContent = result.analysis;
            // Extract product name from analysis and update product summary
            updateProductSummaryFromAnalysis(result.analysis);
        } else {
            document.getElementById('analysisText').textContent = '';
        }

        // Show product confirmation section
        showProductConfirmation(result);
    }

    // Function to extract product name from analysis and update summary
    function updateProductSummaryFromAnalysis(analysis) {
        // Simply set the product summary to "Completed"
        document.getElementById('productSummary').textContent = 'Completed';
    }

    // Function to show product confirmation section
    function showProductConfirmation(result) {
        const productConfirmationSection = document.getElementById('productConfirmationSection');
        const confirmedProductName = document.getElementById('confirmedProductName');
        const confirmedProductNotes = document.getElementById('confirmedProductNotes');

        if (productConfirmationSection && confirmedProductName) {
            // Pre-populate the product name from the original title or analysis
            const productName = productTitleInput ? productTitleInput.value.trim() : 'Identified Product';
            confirmedProductName.value = productName;
            confirmedProductNotes.value = '';

            // Show the confirmation section
            productConfirmationSection.style.display = 'block';
        }
    }

    // Function to proceed to step 2 after product confirmation
    function proceedToStep2() {
        currentStep = 2;
        updateStepActions(currentStep);
        // Enable the complete analysis button
        if (completeAnalysisBtn) {
            completeAnalysisBtn.disabled = false;
            completeAnalysisBtn.style.display = 'inline-block';
        }
    }

    // Function to display pricing results
    function displayPricing(result) {
        document.getElementById('newPrice').textContent = result.pricing.newPrice;
        document.getElementById('usedPrice').textContent = result.pricing.usedPrice;
        document.getElementById('reasoning').textContent = result.pricing.reasoning;

        pricingSection.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth' });

        currentPricing = result.pricing;
    }

    // Function to display sales text results
    function displaySalesText(result) {
        document.getElementById('salesText').textContent = result.salesText;

        salesTextSection.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth' });

        currentSalesText = result.salesText;
        currentStep = 3;
        updateStepActions(currentStep);
    }

    // Function to reset camera container to only show video
    function resetCameraContainerToVideo() {
        cameraContainer.querySelectorAll('img').forEach(img => img.remove());
        video.style.display = 'block';
    }

    // Function to send client errors to the server
    function logClientErrorToServer(message, stack) {
        fetch('/log-client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                stack,
                url: window.location.href,
                userAgent: navigator.userAgent
            })
        }).catch(() => { });
    }

    // Global error handler
    window.onerror = function (message, source, lineno, colno, error) {
        logClientErrorToServer(message, error && error.stack ? error.stack : `${source}:${lineno}:${colno}`);
    };
    window.addEventListener('unhandledrejection', function (event) {
        logClientErrorToServer(event.reason && event.reason.message ? event.reason.message : 'Unhandled rejection', event.reason && event.reason.stack ? event.reason.stack : '');
    });

    // Check LLM server status
    async function checkLLMStatus() {
        console.log('🔍 Checking LLM server status...');
        try {
            const response = await fetch('/health/llm');
            const status = await response.json();
            llmStatus = status;
            console.log('📊 LLM status:', status);
            return status.available;
        } catch (error) {
            console.error('❌ Failed to check LLM status:', error);
            llmStatus = { available: false, error: error.message };
            return false;
        }
    }

    // Check sales site database status
    async function checkSalesSiteStatus() {
        console.log('🔍 Checking sales site database status...');
        try {
            const response = await fetch('/health/sales-site');
            const status = await response.json();
            console.log('📊 Sales site status:', status);
            return status;
        } catch (error) {
            console.error('❌ Failed to check sales site status:', error);
            return { connected: false, error: error.message };
        }
    }

    // Update UI based on LLM status
    function updateLLMStatusUI() {
        console.log('🔄 Updating LLM status UI...');
        const statusIndicator = document.getElementById('llmStatus');
        if (statusIndicator) {
            if (llmStatus && llmStatus.available) {
                statusIndicator.innerHTML = '🟢 LLM server is running';
                statusIndicator.style.color = '#28a745';
                console.log('✅ LLM status: Available');
            } else {
                statusIndicator.innerHTML = '🔴 LLM server is not available';
                statusIndicator.style.color = '#dc3545';
                console.log('❌ LLM status: Not available');
            }
        }
    }

    // Update UI based on sales site status
    function updateSalesSiteStatusUI(status) {
        console.log('🔄 Updating sales site status UI...');
        const statusIndicator = document.getElementById('salesSiteStatus');
        if (statusIndicator) {
            if (status && status.connected) {
                statusIndicator.innerHTML = `🟢 Sales site connected (${status.categories} categories)`;
                statusIndicator.style.color = '#28a745';
                console.log('✅ Sales site status: Connected');
            } else {
                statusIndicator.innerHTML = '🔴 Sales site not connected';
                statusIndicator.style.color = '#dc3545';
                console.log('❌ Sales site status: Not connected');
            }
        }
    }

    // Step 1: Identify Product
    if (identifyProductBtn) {
        identifyProductBtn.addEventListener('click', async () => {
            const startTime = Date.now();
            addLog('🔍 User clicked Identify Product button');

            if (!capturedImage) {
                addLog('❌ No image captured');
                showError('Please capture or upload an image first.');
                return;
            }

            if (!productTitleInput.value.trim()) {
                addLog('❌ No product title entered');
                showError('Please enter a product title.');
                productTitleInput.focus();
                return;
            }

            addLog(`📝 Product title: "${productTitleInput.value.trim()}"`);
            addLog('🔍 Starting product identification with Google Vision API...');

            try {
                loading.style.display = 'block';
                loadingText.textContent = '🔍 Identifying product with Google Vision API...';

                const formData = new FormData();
                formData.append('image', capturedImage, 'object.jpg');
                formData.append('productTitle', productTitleInput.value.trim());
                if (hintInput.value.trim()) {
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
                addLog(`✅ Product identification completed in ${totalTime}ms`);
                addLog('📊 Result received');

                displayProductIdentification(result);

            } catch (error) {
                const totalTime = Date.now() - startTime;
                console.error(`❌ Product identification failed after ${totalTime}ms:`, error);
                showError('Failed to identify product: ' + error.message);
            } finally {
                loading.style.display = 'none';
            }
        });
    }

    // Step 2: Generate Pricing & Sales Text
    if (completeAnalysisBtn) {
        completeAnalysisBtn.addEventListener('click', async () => {
            if (!selectedAnalysis) {
                showError('Please identify the product and select a candidate first.');
                return;
            }
            try {
                addLog('💰 Starting pricing and sales text generation...');
                loading.style.display = 'block';
                loadingText.textContent = 'Generating pricing and sales text...';
                // 1. Generate pricing
                const pricingResponse = await fetch('/generate-pricing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analysis: selectedAnalysis, userHint: hintInput.value.trim() || null })
                });
                if (!pricingResponse.ok) {
                    const errorText = await pricingResponse.text();
                    throw new Error('Server error: ' + errorText);
                }
                const pricingResult = await pricingResponse.json();
                addLog('✅ Pricing analysis completed');
                displayPricing(pricingResult);
                // 2. Generate sales text
                addLog('📝 Starting sales text generation...');
                const salesTextResponse = await fetch('/generate-sales-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        analysis: selectedAnalysis,
                        pricing: pricingResult.pricing,
                        userHint: hintInput.value.trim() || null,
                        additionalHints: document.getElementById('additionalHintsInput') ? document.getElementById('additionalHintsInput').value.trim() || null : null
                    })
                });
                if (!salesTextResponse.ok) {
                    const errorText = await salesTextResponse.text();
                    throw new Error('Server error: ' + errorText);
                }
                const salesTextResult = await salesTextResponse.json();
                addLog('✅ Sales text generation completed');
                displaySalesText(salesTextResult);
            } catch (error) {
                addLog(`❌ Pricing & sales text generation error: ${error.message}`);
                console.error('Pricing & sales text generation error:', error);
                showError('Failed to generate pricing & sales text: ' + error.message);
            } finally {
                loading.style.display = 'none';
            }
        });
    }

    // Camera functionality with better browser support
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', async () => {
            if (stream) {
                stopCamera();
                return;
            }

            clearResults();
            resetCameraContainerToVideo();

            try {
                let getUserMedia = null;

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                } else if (navigator.getUserMedia) {
                    getUserMedia = navigator.getUserMedia.bind(navigator);
                } else if (navigator.webkitGetUserMedia) {
                    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
                } else if (navigator.mozGetUserMedia) {
                    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
                }

                if (!getUserMedia) {
                    throw new Error('Camera API not supported in this browser. Please use the "Upload Photo" option instead.');
                }

                if (navigator.permissions) {
                    try {
                        const permission = await navigator.permissions.query({ name: 'camera' });
                        if (permission.state === 'denied') {
                            throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
                        }
                    } catch (permError) {
                        console.log('Permission API not available, proceeding with getUserMedia');
                    }
                }

                let constraints;

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    constraints = {
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280, max: 1920 },
                            height: { ideal: 720, max: 1080 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false
                    };
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } else {
                    constraints = {
                        video: true,
                        audio: false
                    };
                    stream = await getUserMedia(constraints);
                }

                video.srcObject = stream;
                video.style.display = 'block';
                cameraPlaceholder.style.display = 'none';
                cameraContainer.classList.add('has-image');
                cameraContainer.classList.add('camera-active');

                // Mobile optimization: scroll to top and expand camera
                if (window.innerWidth <= 768) {
                    cameraContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                startCameraBtn.textContent = 'Stop Camera';
                if (capturePhotoBtn) capturePhotoBtn.disabled = false;

                video.addEventListener('loadedmetadata', () => {
                    console.log('Camera started successfully');
                });

            } catch (error) {
                console.error('Camera error:', error);

                let errorMessage = 'Unable to access camera. ';

                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage += 'Please allow camera access when prompted, or check your browser settings.';
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    errorMessage += 'No camera found on this device.';
                } else if (error.name === 'NotSupportedError' || error.name === 'ConstraintNotSatisfiedError') {
                    errorMessage += 'Camera not supported or constraints not satisfied.';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    errorMessage += 'Camera is in use by another application.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred.';
                }

                showError(errorMessage);
                logClientErrorToServer('Camera error', error && error.stack ? error.stack : error);
                addLog(`Camera Error: ${errorMessage}`, 'error');

                setTimeout(() => {
                    showError('You can still use the "Upload Photo" button to analyze images from your gallery.');
                }, 3000);
            }
        });
    }

    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', () => {
            clearResults();
            resetCameraContainerToVideo();
            fileInput.click();
        });
    }

    if (capturePhotoBtn) {
        capturePhotoBtn.addEventListener('click', () => {
            if (stream) {
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0);

                canvas.toBlob((blob) => {
                    capturedImage = blob;
                    cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(blob);
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    img.style.borderRadius = '15px';
                    img.style.display = 'block';
                    video.style.display = 'none';
                    cameraPlaceholder.classList.add('hidden');
                    cameraContainer.appendChild(img);
                    stopCamera();
                    hideCameraButtons();
                    updateIdentifyButtonState(); // Update button state based on both image and title
                }, 'image/jpeg', 0.8);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '15px';
                img.style.display = 'block';
                video.style.display = 'none';
                cameraPlaceholder.classList.add('hidden');
                cameraContainer.appendChild(img);
                capturedImage = file;
                hideCameraButtons();
                updateIdentifyButtonState(); // Update button state based on both image and title
            }
        });
    }

    // Event listeners for additional camera buttons in results section
    if (startCameraBtn2) {
        startCameraBtn2.addEventListener('click', async () => {
            if (stream) {
                stopCamera();
                return;
            }

            clearResults();
            resetCameraContainerToVideo();

            try {
                let getUserMedia = null;

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                } else if (navigator.getUserMedia) {
                    getUserMedia = navigator.getUserMedia.bind(navigator);
                } else if (navigator.webkitGetUserMedia) {
                    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
                } else if (navigator.mozGetUserMedia) {
                    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
                }

                if (!getUserMedia) {
                    throw new Error('Camera API not supported in this browser. Please use the "Upload Photo" option instead.');
                }

                if (navigator.permissions) {
                    try {
                        const permission = await navigator.permissions.query({ name: 'camera' });
                        if (permission.state === 'denied') {
                            throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
                        }
                    } catch (permError) {
                        console.log('Permission API not available, proceeding with getUserMedia');
                    }
                }

                let constraints;

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    constraints = {
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280, max: 1920 },
                            height: { ideal: 720, max: 1080 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false
                    };
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } else {
                    constraints = {
                        video: true,
                        audio: false
                    };
                    stream = await getUserMedia(constraints);
                }

                video.srcObject = stream;
                video.style.display = 'block';
                cameraPlaceholder.style.display = 'none';
                cameraContainer.classList.add('has-image');
                cameraContainer.classList.add('camera-active');

                // Mobile optimization: scroll to top and expand camera
                if (window.innerWidth <= 768) {
                    cameraContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                startCameraBtn.textContent = 'Stop Camera';
                startCameraBtn2.textContent = 'Stop Camera';
                if (capturePhotoBtn) capturePhotoBtn.disabled = false;
                if (capturePhotoBtn2) capturePhotoBtn2.disabled = false;

                video.addEventListener('loadedmetadata', () => {
                    console.log('Camera started successfully');
                });

            } catch (error) {
                console.error('Camera error:', error);

                let errorMessage = 'Unable to access camera. ';

                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage += 'Please allow camera access when prompted, or check your browser settings.';
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    errorMessage += 'No camera found on this device.';
                } else if (error.name === 'NotSupportedError' || error.name === 'ConstraintNotSatisfiedError') {
                    errorMessage += 'Camera not supported or constraints not satisfied.';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    errorMessage += 'Camera is in use by another application.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred.';
                }

                showError(errorMessage);
                logClientErrorToServer('Camera error', error && error.stack ? error.stack : error);
                addLog(`Camera Error: ${errorMessage}`, 'error');

                setTimeout(() => {
                    showError('You can still use the "Upload Photo" button to analyze images from your gallery.');
                }, 3000);
            }
        });

        if (uploadPhotoBtn2) {
            uploadPhotoBtn2.addEventListener('click', () => {
                clearResults();
                resetCameraContainerToVideo();
                fileInput2.click();
            });
        }

        if (capturePhotoBtn2) {
            capturePhotoBtn2.addEventListener('click', () => {
                if (stream) {
                    const context = canvas.getContext('2d');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0);

                    canvas.toBlob((blob) => {
                        capturedImage = blob;
                        cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(blob);
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        img.style.borderRadius = '15px';
                        img.style.display = 'block';
                        video.style.display = 'none';
                        cameraPlaceholder.classList.add('hidden');
                        cameraContainer.appendChild(img);
                        stopCamera();
                        hideCameraButtons();
                        updateIdentifyButtonState(); // Update button state based on both image and title
                    }, 'image/jpeg', 0.8);
                }
            });

            if (fileInput2) {
                fileInput2.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        img.style.borderRadius = '15px';
                        img.style.display = 'block';
                        video.style.display = 'none';
                        cameraPlaceholder.classList.add('hidden');
                        cameraContainer.appendChild(img);
                        capturedImage = file;
                        hideCameraButtons();
                        updateIdentifyButtonState(); // Update button state based on both image and title
                    }
                });
            }

            // Stop camera when leaving page
            window.addEventListener('beforeunload', () => {
                stopCamera();
            });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden && stream) {
                    stopCamera();
                }
            });

            // Product selection event listeners
            // After confirming or skipping product selection, call /generate-analysis and store the result for pricing/sales text
            if (confirmProductBtn) {
                confirmProductBtn.addEventListener('click', async () => {
                    if (selectedProductCandidate && currentResult) {
                        productSelectionSection.style.display = 'none';
                        document.getElementById('productSummary').textContent = selectedProductCandidate.name;
                        document.getElementById('productIdentificationDetails').open = false;
                        // Generate detailed analysis using the candidate and vision data
                        try {
                            loading.style.display = 'block';
                            loadingText.textContent = 'Generating detailed analysis...';
                            const analysisResponse = await fetch('/generate-analysis', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    candidate: selectedProductCandidate,
                                    googleVisionData: currentResult.productData,
                                    userHint: hintInput.value.trim() || null
                                })
                            });
                            if (!analysisResponse.ok) {
                                const errorText = await analysisResponse.text();
                                throw new Error('Server error: ' + errorText);
                            }
                            const analysisResult = await analysisResponse.json();
                            selectedAnalysis = analysisResult.analysis;
                            document.getElementById('analysisText').innerText = selectedAnalysis;
                            // Update product summary from the detailed analysis
                            updateProductSummaryFromAnalysis(selectedAnalysis);
                        } catch (error) {
                            showError('Failed to generate detailed analysis: ' + error.message);
                            selectedAnalysis = null;
                        } finally {
                            loading.style.display = 'none';
                        }
                        proceedWithAnalysis({ ...currentResult, analysis: selectedAnalysis });
                    }
                });
            }

            if (skipSelectionBtn) {
                skipSelectionBtn.addEventListener('click', async () => {
                    if (currentResult) {
                        productSelectionSection.style.display = 'none';
                        document.getElementById('productIdentificationDetails').open = false;
                        // Use the first candidate or detected object as the analysis
                        const productData = currentResult.productData;
                        let candidate = null;
                        if (productData.productCandidates && productData.productCandidates.length > 0) {
                            candidate = productData.productCandidates[0];
                        } else if (productData.detectedObjects && productData.detectedObjects.length > 0) {
                            candidate = { name: productData.detectedObjects[0], description: productData.detectedObjects[0] };
                        } else {
                            candidate = { name: 'Unknown product', description: 'Unknown product' };
                        }
                        try {
                            loading.style.display = 'block';
                            loadingText.textContent = 'Generating detailed analysis...';
                            const analysisResponse = await fetch('/generate-analysis', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    candidate: candidate,
                                    googleVisionData: productData,
                                    userHint: hintInput.value.trim() || null
                                })
                            });
                            if (!analysisResponse.ok) {
                                const errorText = await analysisResponse.text();
                                throw new Error('Server error: ' + errorText);
                            }
                            const analysisResult = await analysisResponse.json();
                            selectedAnalysis = analysisResult.analysis;
                            document.getElementById('analysisText').innerText = selectedAnalysis;
                            // Update product summary from the detailed analysis
                            updateProductSummaryFromAnalysis(selectedAnalysis);
                        } catch (error) {
                            showError('Failed to generate detailed analysis: ' + error.message);
                            selectedAnalysis = null;
                        } finally {
                            loading.style.display = 'none';
                        }
                        proceedWithAnalysis({ ...currentResult, analysis: selectedAnalysis });
                    }
                });
            }

            // Disable the Generate Pricing & Sales Text button until analysis is ready
            if (completeAnalysisBtn) completeAnalysisBtn.disabled = true;

            // Reset button functionality
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    clearResults();
                    stopCamera();
                    resetCameraContainerToVideo();
                    showCameraButtons();
                    cameraPlaceholder.classList.remove('hidden');
                    updateIdentifyButtonState(); // Reset button state
                });
            }

            // Email functionality
            if (sendEmailBtn) {
                sendEmailBtn.addEventListener('click', async () => {
                    if (!currentAnalysis || !currentPricing || !currentSalesText) {
                        showError('Please complete the analysis and generate pricing & sales text first.');
                        return;
                    }

                    try {
                        loading.style.display = 'block';
                        loadingText.textContent = 'Sending email...';

                        const formData = new FormData();
                        formData.append('pricing', JSON.stringify(currentPricing));
                        formData.append('salesText', currentSalesText);
                        formData.append('image', capturedImage, 'product.jpg');
                        formData.append('productName', document.getElementById('productSummary').textContent || 'Unknown Product');

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
                        emailSection.style.display = 'block';
                        results.scrollIntoView({ behavior: 'smooth' });

                    } catch (error) {
                        console.error('Email sending error:', error);
                        showError('Failed to send email: ' + error.message);
                    } finally {
                        loading.style.display = 'none';
                    }
                });
            }

            // Function to show success messages
            function showSuccess(message) {
                const successDiv = document.createElement('div');
                successDiv.className = 'success';
                successDiv.style.cssText = 'background: #d4edda; color: #155724; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #c3e6cb;';
                successDiv.textContent = message;

                const content = document.querySelector('.content');
                content.insertBefore(successDiv, content.firstChild);

                setTimeout(() => {
                    successDiv.remove();
                }, 5000);
            }

            // Event listeners for additional buttons in sales text section
            if (sendEmailBtn2) {
                sendEmailBtn2.addEventListener('click', async () => {
                    if (!currentAnalysis || !currentPricing || !currentSalesText) {
                        showError('Please complete the analysis and generate pricing & sales text first.');
                        return;
                    }

                    try {
                        loading.style.display = 'block';
                        loadingText.textContent = 'Sending email...';

                        const formData = new FormData();
                        formData.append('pricing', JSON.stringify(currentPricing));
                        formData.append('salesText', currentSalesText);
                        formData.append('image', capturedImage, 'product.jpg');
                        formData.append('productName', document.getElementById('productSummary').textContent || 'Unknown Product');

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
                        emailSection.style.display = 'block';
                        results.scrollIntoView({ behavior: 'smooth' });

                    } catch (error) {
                        console.error('Email sending error:', error);
                        showError('Failed to send email: ' + error.message);
                    } finally {
                        loading.style.display = 'none';
                    }
                });
            }

            if (resetBtn2) {
                resetBtn2.addEventListener('click', () => {
                    clearResults();
                    stopCamera();
                    resetCameraContainerToVideo();
                    showCameraButtons();
                    cameraPlaceholder.classList.remove('hidden');
                    updateIdentifyButtonState(); // Reset button state
                });
            }

            // Create item functionality
            if (createItemBtn) {
                createItemBtn.addEventListener('click', async () => {
                    if (!currentAnalysis || !currentPricing || !currentSalesText) {
                        showError('Please complete the analysis and generate pricing & sales text first.');
                        return;
                    }

                    try {
                        loading.style.display = 'block';
                        loadingText.textContent = 'Creating item in sales site...';

                        const formData = new FormData();
                        formData.append('analysis', currentAnalysis);
                        formData.append('pricing', JSON.stringify(currentPricing));
                        formData.append('salesText', currentSalesText);
                        formData.append('productName', document.getElementById('productSummary').textContent || 'Unknown Product');
                        if (capturedImage) {
                            formData.append('image', capturedImage, 'product.jpg');
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
                            document.getElementById('itemDetails').textContent =
                                `Item: ${result.item.title} | Price: €${result.item.price} | Status: ${result.item.isPublished ? 'Published' : 'Draft'}`;
                            itemSection.style.display = 'block';
                            results.scrollIntoView({ behavior: 'smooth' });
                            showSuccess('Item created successfully in sales site!');
                        } else {
                            throw new Error(result.error || 'Failed to create item');
                        }

                    } catch (error) {
                        console.error('Item creation error:', error);
                        showError('Failed to create item: ' + error.message);
                    } finally {
                        loading.style.display = 'none';
                    }
                });
            }

            // Tab switching logic
            // Remove the .tabs, .tab-btn, .tab-panel markup and related JS logic
            // Place all result sections in a single column, as before
            // Restore sequential display of productIdentificationSection, pricingSection, salesTextSection, etc.
            // Remove showTab and tab switching logic
            // ... existing code ...
        }

        // Add event listener for product title input
        if (productTitleInput) {
            productTitleInput.addEventListener('input', updateIdentifyButtonState);
            productTitleInput.addEventListener('keyup', updateIdentifyButtonState);
        }

        // Add event listeners for product confirmation
        const confirmProductDetails = document.getElementById('confirmProductDetails');
        const editProductDetails = document.getElementById('editProductDetails');

        if (confirmProductDetails) {
            confirmProductDetails.addEventListener('click', () => {
                const confirmedProductName = document.getElementById('confirmedProductName');
                const productConfirmationSection = document.getElementById('productConfirmationSection');

                if (confirmedProductName && confirmedProductName.value.trim()) {
                    // Update the product summary with the confirmed name
                    document.getElementById('productSummary').textContent = confirmedProductName.value.trim();

                    // Hide the confirmation section
                    if (productConfirmationSection) {
                        productConfirmationSection.style.display = 'none';
                    }

                    // Proceed to step 2
                    proceedToStep2();
                } else {
                    showError('Please enter a product name to continue.');
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

        // Log controls
        const clearLogs = document.getElementById('clearLogs');
        const toggleLogs = document.getElementById('toggleLogs');

        if (clearLogs) {
            clearLogs.addEventListener('click', () => {
                const logContent = document.getElementById('logContent');
                if (logContent) {
                    logContent.textContent = 'Logs cleared...\n';
                }
            });
        }

        if (toggleLogs) {
            toggleLogs.addEventListener('click', () => {
                const logSection = document.getElementById('logSection');
                const logContent = document.getElementById('logContent');
                if (logSection && logContent) {
                    if (logSection.style.display === 'none') {
                        logSection.style.display = 'block';
                        toggleLogs.textContent = 'Hide Logs';
                    } else {
                        logSection.style.display = 'none';
                        toggleLogs.textContent = 'Show Logs';
                    }
                }
            });
        }

        // Initialize status checks on page load
        addLog('🔄 Starting system status checks...');
        Promise.all([
            checkLLMStatus().then(() => {
                addLog('✅ LLM status check completed');
                updateLLMStatusUI();
            }),
            checkSalesSiteStatus().then((status) => {
                addLog('✅ Sales site status check completed');
                updateSalesSiteStatusUI(status);
            })
        ]).catch(error => {
            addLog(`❌ Failed to check system status: ${error.message}`);
        });

        // Initialize step 1 UI
        updateStepActions(1);

        // Force button to be visible on page load
        identifyProductBtn.style.display = 'inline-block';
        identifyProductBtn.style.visibility = 'visible';
        identifyProductBtn.style.opacity = '1';

        // Also force it to be visible after a short delay to override any other JavaScript
        setTimeout(() => {
            identifyProductBtn.style.display = 'inline-block';
            identifyProductBtn.style.visibility = 'visible';
            identifyProductBtn.style.opacity = '1';
        }, 100);
    }
}); // Close the DOMContentLoaded event listener

