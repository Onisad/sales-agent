// Camera functionality module
window.CameraModule = {
    // Function to stop camera
    stopCamera: function () {
        if (window.SalesApp.stream) {
            window.SalesApp.stream.getTracks().forEach(track => track.stop());
            window.SalesApp.stream = null;
        }
        const video = document.getElementById('video');
        const cameraContainer = document.getElementById('cameraContainer');
        const startCameraBtn = document.getElementById('startCamera');
        const startCameraBtn2 = document.getElementById('startCamera2');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const capturePhotoBtn2 = document.getElementById('capturePhoto2');

        if (video) video.style.display = 'none';
        if (cameraContainer) {
            cameraContainer.classList.remove('has-image');
            cameraContainer.classList.remove('camera-active');
        }
        if (startCameraBtn) startCameraBtn.textContent = 'Start Camera';
        if (startCameraBtn2) startCameraBtn2.textContent = 'Start Camera';
        if (capturePhotoBtn) capturePhotoBtn.disabled = true;
        if (capturePhotoBtn2) capturePhotoBtn2.disabled = true;
    },

    // Function to hide camera buttons after photo capture
    hideCameraButtons: function () {
        const startCameraBtn = document.getElementById('startCamera');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const uploadPhotoBtn = document.getElementById('uploadPhoto');
        const startCameraBtn2 = document.getElementById('startCamera2');
        const capturePhotoBtn2 = document.getElementById('capturePhoto2');
        const uploadPhotoBtn2 = document.getElementById('uploadPhoto2');

        if (startCameraBtn) startCameraBtn.style.display = 'none';
        if (capturePhotoBtn) capturePhotoBtn.style.display = 'none';
        if (uploadPhotoBtn) uploadPhotoBtn.style.display = 'none';
        if (startCameraBtn2) startCameraBtn2.style.display = 'none';
        if (capturePhotoBtn2) capturePhotoBtn2.style.display = 'none';
        if (uploadPhotoBtn2) uploadPhotoBtn2.style.display = 'none';
    },

    // Function to show camera buttons
    showCameraButtons: function () {
        const startCameraBtn = document.getElementById('startCamera');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const uploadPhotoBtn = document.getElementById('uploadPhoto');
        const startCameraBtn2 = document.getElementById('startCamera2');
        const capturePhotoBtn2 = document.getElementById('capturePhoto2');
        const uploadPhotoBtn2 = document.getElementById('uploadPhoto2');

        if (startCameraBtn) startCameraBtn.style.display = 'inline-block';
        if (capturePhotoBtn) capturePhotoBtn.style.display = 'inline-block';
        if (uploadPhotoBtn) uploadPhotoBtn.style.display = 'inline-block';
        if (startCameraBtn2) startCameraBtn2.style.display = 'inline-block';
        if (capturePhotoBtn2) capturePhotoBtn2.style.display = 'inline-block';
        if (uploadPhotoBtn2) uploadPhotoBtn2.style.display = 'inline-block';
    },

    // Function to reset camera container to only show video
    resetCameraContainerToVideo: function () {
        const cameraContainer = document.getElementById('cameraContainer');
        const video = document.getElementById('video');

        if (cameraContainer) {
            cameraContainer.querySelectorAll('img').forEach(img => img.remove());
        }
        if (video) video.style.display = 'block';
    },

    // Function to update identify button state
    updateIdentifyButtonState: function () {
        const identifyProductBtn = document.getElementById('identifyProduct');

        if (identifyProductBtn) {
            const hasImage = window.SalesApp.capturedImage !== null;
            identifyProductBtn.disabled = !hasImage;
        }
    },

    // Start camera functionality
    startCamera: async function () {
        if (window.SalesApp.stream) {
            this.stopCamera();
            return;
        }

        // Clear results and reset camera
        if (typeof ProductIdentificationModule !== 'undefined') {
            ProductIdentificationModule.clearResults();
        }
        this.resetCameraContainerToVideo();

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
                window.SalesApp.stream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
                constraints = {
                    video: true,
                    audio: false
                };
                window.SalesApp.stream = await getUserMedia(constraints);
            }

            const video = document.getElementById('video');
            const cameraContainer = document.getElementById('cameraContainer');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');
            const startCameraBtn = document.getElementById('startCamera');
            const startCameraBtn2 = document.getElementById('startCamera2');
            const capturePhotoBtn = document.getElementById('capturePhoto');
            const capturePhotoBtn2 = document.getElementById('capturePhoto2');

            if (video) {
                video.srcObject = window.SalesApp.stream;
                video.style.display = 'block';
            }
            if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
            if (cameraContainer) {
                cameraContainer.classList.add('has-image');
                cameraContainer.classList.add('camera-active');
            }

            // Mobile optimization: scroll to top and expand camera
            if (window.innerWidth <= 768) {
                if (cameraContainer) {
                    cameraContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            if (startCameraBtn) startCameraBtn.textContent = 'Stop Camera';
            if (startCameraBtn2) startCameraBtn2.textContent = 'Stop Camera';
            if (capturePhotoBtn) capturePhotoBtn.disabled = false;
            if (capturePhotoBtn2) capturePhotoBtn2.disabled = false;

            if (video) {
                video.addEventListener('loadedmetadata', () => {
                    console.log('Camera started successfully');
                });
            }

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

            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.showError(errorMessage);
                UtilsModule.logClientErrorToServer('Camera error', error && error.stack ? error.stack : error);
                UtilsModule.addLog(`Camera Error: ${errorMessage}`, 'error');

                setTimeout(() => {
                    UtilsModule.showError('You can still use the "Upload Photo" button to analyze images from your gallery.');
                }, 3000);
            }
        }
    },

    // Capture photo functionality
    capturePhoto: function () {
        if (window.SalesApp.stream) {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const cameraContainer = document.getElementById('cameraContainer');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');

            if (video && canvas) {
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0);

                canvas.toBlob((blob) => {
                    if (typeof QueueModule !== 'undefined' && QueueModule.isQueueModeEnabled && QueueModule.isQueueModeEnabled()) {
                        QueueModule.enqueueCapture(blob, 'camera');
                        if (typeof UtilsModule !== 'undefined') {
                            UtilsModule.addLog('⚡ Photo captured and added to queue.');
                        }
                        if (cameraPlaceholder) cameraPlaceholder.classList.add('hidden');
                        // Flash the camera container to confirm the capture without stopping the feed
                        if (cameraContainer) {
                            cameraContainer.classList.add('capture-flash');
                            setTimeout(() => cameraContainer.classList.remove('capture-flash'), 350);
                        }
                        return;
                    }

                    window.SalesApp.capturedImage = blob;
                    if (cameraContainer) {
                        cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(blob);
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        img.style.borderRadius = '15px';
                        img.style.display = 'block';
                        cameraContainer.appendChild(img);
                    }
                    if (video) video.style.display = 'none';
                    if (cameraPlaceholder) cameraPlaceholder.classList.add('hidden');

                    this.stopCamera();
                    this.hideCameraButtons();
                    this.updateIdentifyButtonState();
                }, 'image/jpeg', 0.8);
            }
        }
    },

    // Upload photo functionality
    uploadPhoto: function (fileInput) {
        const file = fileInput.files[0];
        if (file) {
            const cameraContainer = document.getElementById('cameraContainer');
            const video = document.getElementById('video');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');

            if (typeof QueueModule !== 'undefined' && QueueModule.isQueueModeEnabled && QueueModule.isQueueModeEnabled()) {
                QueueModule.enqueueCapture(file, 'upload');
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog('🧾 Uploaded photo queued for automated processing.');
                }
                if (cameraContainer) {
                    cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                }
                if (video) video.style.display = 'block';
                if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
                return;
            }

            if (cameraContainer) {
                cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '15px';
                img.style.display = 'block';
                cameraContainer.appendChild(img);
            }
            if (video) video.style.display = 'none';
            if (cameraPlaceholder) cameraPlaceholder.classList.add('hidden');

            window.SalesApp.capturedImage = file;
            this.hideCameraButtons();
            this.updateIdentifyButtonState();
        }
    },

    // Initialize camera module
    init: function () {
        const startCameraBtn = document.getElementById('startCamera');
        const startCameraBtn2 = document.getElementById('startCamera2');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const capturePhotoBtn2 = document.getElementById('capturePhoto2');
        const uploadPhotoBtn = document.getElementById('uploadPhoto');
        const uploadPhotoBtn2 = document.getElementById('uploadPhoto2');
        const fileInput = document.getElementById('fileInput');
        const fileInput2 = document.getElementById('fileInput2');

        // Start camera button 1
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }

        // Start camera button 2
        if (startCameraBtn2) {
            startCameraBtn2.addEventListener('click', () => this.startCamera());
        }

        // Capture photo button 1
        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
        }

        // Capture photo button 2
        if (capturePhotoBtn2) {
            capturePhotoBtn2.addEventListener('click', () => this.capturePhoto());
        }

        // Upload photo button 1
        if (uploadPhotoBtn) {
            uploadPhotoBtn.addEventListener('click', () => {
                if (typeof ProductIdentificationModule !== 'undefined') {
                    ProductIdentificationModule.clearResults();
                }
                this.resetCameraContainerToVideo();
                if (fileInput) fileInput.click();
            });
        }

        // Upload photo button 2
        if (uploadPhotoBtn2) {
            uploadPhotoBtn2.addEventListener('click', () => {
                if (typeof ProductIdentificationModule !== 'undefined') {
                    ProductIdentificationModule.clearResults();
                }
                this.resetCameraContainerToVideo();
                if (fileInput2) fileInput2.click();
            });
        }

        // File input 1
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.uploadPhoto(e.target));
        }

        // File input 2
        if (fileInput2) {
            fileInput2.addEventListener('change', (e) => this.uploadPhoto(e.target));
        }

        // Stop camera when leaving page
        window.addEventListener('beforeunload', () => {
            this.stopCamera();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.SalesApp.stream) {
                this.stopCamera();
            }
        });
    }
};


