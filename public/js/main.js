// Main application entry point
document.addEventListener('DOMContentLoaded', function () {
    // Initialize global state
    window.SalesApp = {
        stream: null,
        capturedImage: null,
        currentStep: 1,
        currentAnalysis: null,
        currentPricing: null,
        currentResult: null,
        currentSalesText: null,
        llmStatus: null,
        selectedProductCandidate: null,
        selectedAnalysis: null,
        queueState: {
            enabled: false,
            autoProcess: true,
            activeCount: 0,
            maxConcurrent: 2,
            items: [],
            captureCount: 0
        }
    };

    // Initialize all modules
    if (typeof CameraModule !== 'undefined') {
        CameraModule.init();
    }

    if (typeof QueueModule !== 'undefined') {
        QueueModule.init();
    }

    if (typeof ProductIdentificationModule !== 'undefined') {
        ProductIdentificationModule.init();
    }

    if (typeof PricingModule !== 'undefined') {
        PricingModule.init();
    }

    if (typeof SalesTextModule !== 'undefined') {
        SalesTextModule.init();
    }

    if (typeof UtilsModule !== 'undefined') {
        UtilsModule.init();
    }

    // Only check sales site on load; LLM is checked when user clicks Start Processing
    if (typeof UtilsModule !== 'undefined') {
        UtilsModule.addLog('🔄 Checking sales site…');
        UtilsModule.checkSalesSiteStatus().then((status) => {
            UtilsModule.updateSalesSiteStatusUI(status);
            UtilsModule.addLog(status && status.connected ? '✅ Sales site connected.' : '❌ Sales site not connected.');
        }).catch(err => UtilsModule.addLog('❌ Sales site check failed: ' + err.message));
        UtilsModule.updateLLMStatusUI(); // show "not checked" until Start Processing
        const connectionAlertRetry = document.getElementById('connectionAlertRetry');
        if (connectionAlertRetry) {
            connectionAlertRetry.addEventListener('click', () => UtilsModule.recheckLLMAndUpdate());
        }
    }

    // Initialize step 1 UI
    if (typeof ProductIdentificationModule !== 'undefined') {
        ProductIdentificationModule.updateStepActions(1);
    }

    // Force button to be visible on page load
    const identifyProductBtn = document.getElementById('identifyProduct');
    if (identifyProductBtn) {
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

    // Start Again button (now in log section)
    const startAgainBtn = document.getElementById('startAgainBtn');
    if (startAgainBtn) {
        startAgainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Clear all results
            if (typeof ProductIdentificationModule !== 'undefined') {
                ProductIdentificationModule.clearResults();
            }

            // Reset camera and clear image
            if (typeof CameraModule !== 'undefined') {
                CameraModule.stopCamera();
                CameraModule.resetCameraContainerToVideo();
                CameraModule.showCameraButtons();
            }

            // Clear captured image
            window.SalesApp.capturedImage = null;

            // Show queue section again when starting over
            const queueSection = document.getElementById('queueSection');
            if (queueSection) {
                queueSection.style.display = 'block';
            }

            // Reset file inputs
            const fileInput = document.getElementById('fileInput');
            const fileInput2 = document.getElementById('fileInput2');
            if (fileInput) fileInput.value = '';
            if (fileInput2) fileInput2.value = '';

            // Reset camera container
            const cameraContainer = document.getElementById('cameraContainer');
            if (cameraContainer) {
                cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                cameraContainer.classList.remove('has-image');
                const video = document.getElementById('video');
                if (video) video.style.display = 'block';
            }

            // Show camera placeholder
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');
            if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');

            // Update identify button state
            if (typeof CameraModule !== 'undefined') {
                CameraModule.updateIdentifyButtonState();
            }

            // Show product title section again
            const productTitleSection = document.getElementById('productTitleSection');
            if (productTitleSection) productTitleSection.style.display = 'block';

            // Hide results section
            const results = document.getElementById('results');
            if (results) {
                results.style.display = 'none';
                // Update content padding when results are hidden
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.updateContentPadding();
                }
            }

            // Hide step actions after results
            const stepActionsAfterResults = document.getElementById('stepActionsAfterResults');
            if (stepActionsAfterResults) stepActionsAfterResults.style.display = 'none';

            // Reset step
            window.SalesApp.currentStep = 1;
            if (typeof ProductIdentificationModule !== 'undefined') {
                ProductIdentificationModule.updateStepActions(1);
            }

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('🔄 Started again - ready for new product identification');
            }
        });
    }
});








