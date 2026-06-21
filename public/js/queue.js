// Queue processing module
(function () {
    const STATUS_LABELS = {
        idle: 'Idle',
        armed: 'Ready',
        processing: 'Processing',
        partial: 'Pending Review'
    };

    function getState() {
        if (!window.SalesApp) window.SalesApp = {};
        if (!window.SalesApp.queueState) {
            window.SalesApp.queueState = {
                enabled: false,
                autoProcess: true,
                activeCount: 0,
                maxConcurrent: 2,
                items: [],
                captureCount: 0
            };
        }
        const s = window.SalesApp.queueState;
        if (s.activeCount === undefined) s.activeCount = 0;
        if (s.maxConcurrent === undefined) s.maxConcurrent = 2;
        return s;
    }

    function escapeHtml(text = '') {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function timeAgo(timestamp) {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return `${Math.floor(diff / 3600000)}h ago`;
    }

    function pickCandidate(productData) {
        if (productData?.productCandidates?.length) {
            return productData.productCandidates[0];
        }
        if (productData?.detectedObjects?.length) {
            const first = productData.detectedObjects[0];
            return {
                id: `detected_${first}`,
                name: first,
                description: first,
                source: 'detected_object'
            };
        }
        return null;
    }

    function truncate(text, length = 220) {
        if (!text) return '';
        if (text.length <= length) return text;
        return `${text.slice(0, length).trim()}…`;
    }

    const QueueModule = {
        elements: {},

        init() {
            this.elements = {
                toggle: document.getElementById('queueModeToggle'),
                statusBadge: document.getElementById('queueStatusBadge'),
                processBtn: document.getElementById('queueProcessBtn'),
                clearBtn: document.getElementById('queueClearBtn'),
                itemsContainer: document.getElementById('queueItems'),
                emptyState: document.getElementById('queueEmptyState'),
                pendingStat: document.getElementById('queuePendingStat'),
                processingStat: document.getElementById('queueProcessingStat'),
                readyStat: document.getElementById('queueReadyStat'),
                failedStat: document.getElementById('queueFailedStat'),
                batchDrop: document.getElementById('queueBatchDrop'),
                batchInput: document.getElementById('queueBatchInput'),
                batchBrowse: document.getElementById('queueBatchBrowse')
            };

            this.initBatchDrop();

            if (this.elements.toggle) {
                this.elements.toggle.addEventListener('change', (event) => {
                    this.setQueueMode(event.target.checked);
                });
            }

            if (this.elements.processBtn) {
                this.elements.processBtn.addEventListener('click', () => {
                    this.startProcessing(true);
                });
            }

            if (this.elements.clearBtn) {
                this.elements.clearBtn.addEventListener('click', () => {
                    this.clearQueue();
                });
            }

            if (this.elements.itemsContainer) {
                this.elements.itemsContainer.addEventListener('click', (event) => {
                    const action = event.target.dataset.action;
                    if (!action) return;
                    const itemEl = event.target.closest('.queue-item');
                    if (!itemEl) return;
                    const itemId = itemEl.dataset.itemId;
                    if (!itemId) return;

                    if (action === 'send') {
                        this.sendToSalesSite(itemId);
                    } else if (action === 'manual') {
                        this.sendToManualReview(itemId);
                    } else if (action === 'remove') {
                        this.removeItem(itemId);
                    } else if (action === 'retry') {
                        this.retryItem(itemId);
                    }
                });
            }

            this.render();
        },

        initBatchDrop() {
            const drop = this.elements.batchDrop;
            const input = this.elements.batchInput;
            const browse = this.elements.batchBrowse;

            if (browse && input) {
                browse.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    input.value = '';
                    input.click();
                });
            }

            if (input) {
                input.addEventListener('change', (e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    this.addBatchFiles(files);
                    e.target.value = '';
                });
            }

            if (drop) {
                drop.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop.classList.add('queue-drag-over');
                });
                drop.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!drop.contains(e.relatedTarget)) {
                        drop.classList.remove('queue-drag-over');
                    }
                });
                drop.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop.classList.remove('queue-drag-over');
                    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
                    this.addBatchFiles(files);
                });
            }
        },

        addBatchFiles(files) {
            const imageFiles = files.filter(f => f.type && f.type.startsWith('image/'));
            if (imageFiles.length === 0) {
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog('⚠️ No image files to add. Drop or select image files only.');
                }
                return;
            }
            const state = getState();
            if (!state.enabled) {
                this.setQueueMode(true);
            }
            imageFiles.forEach(file => this.enqueueCapture(file, 'upload'));
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog(`📷 Added ${imageFiles.length} photo(s) to the queue.`);
            }
        },

        isQueueModeEnabled() {
            return getState().enabled;
        },

        setQueueMode(enabled) {
            const state = getState();
            state.enabled = enabled;

            if (enabled) {
                if (this.elements.statusBadge) {
                    this.elements.statusBadge.textContent = 'Armed';
                    this.elements.statusBadge.style.background = '#d4edda';
                    this.elements.statusBadge.style.color = '#155724';
                }
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog('🚀 Queue mode enabled – captures will be queued automatically.');
                }
                this.maybeProcess();
            } else {
                if (this.elements.statusBadge) {
                    this.elements.statusBadge.textContent = STATUS_LABELS.idle;
                    this.elements.statusBadge.style.background = '#e9ecef';
                    this.elements.statusBadge.style.color = '#6c757d';
                }
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog('⏸️ Queue mode disabled.');
                }
            }
        },

        enqueueCapture(blob, source = 'camera') {
            const state = getState();
            const id = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const previewUrl = URL.createObjectURL(blob);
            const labelIndex = ++state.captureCount;
            const item = {
                id,
                source,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: 'pending',
                blob,
                previewUrl,
                displayName: `Queued capture #${labelIndex}`,
                logs: []
            };

            state.items.push(item);
            this.render();
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog(`🆕 Queued new capture (${labelIndex})`);
            }
            this.maybeProcess();
        },

        maybeProcess() {
            const state = getState();
            if (!state.autoProcess) return;
            const slots = state.maxConcurrent - state.activeCount;
            if (slots <= 0) return;
            const pending = state.items.filter(item => item.status === 'pending');
            const toRun = pending.slice(0, slots);
            if (toRun.length > 0 && typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog(`📋 Processing ${toRun.length} queued item(s)…`);
            }
            toRun.forEach(item => this.processItem(item.id));
        },

        async startProcessing(manualTrigger = false) {
            const state = getState();
            const pending = state.items.filter(i => i.status === 'pending').length;

            if (manualTrigger && typeof UtilsModule !== 'undefined') {
                if (pending === 0) {
                    UtilsModule.addLog('⚠️ No pending items. Add photos by dropping above or using Browse.');
                    return;
                }
                UtilsModule.addLog(`▶️ Checking LLM connection, then processing ${pending} item(s)…`);
            }

            if (manualTrigger && typeof UtilsModule !== 'undefined') {
                const processBtn = this.elements.processBtn;
                if (processBtn) {
                    processBtn.disabled = true;
                    processBtn.textContent = 'Checking connection…';
                }
                const llmOk = await UtilsModule.checkLLMStatus();
                UtilsModule.updateLLMStatusUI();
                if (processBtn) {
                    processBtn.disabled = false;
                    processBtn.textContent = 'Start Processing';
                }
                if (!llmOk) {
                    const status = window.SalesApp && window.SalesApp.llmStatus;
                    const msg = (status && (status.message || status.error)) || 'LLM server not reachable.';
                    UtilsModule.showError('Cannot start: ' + msg);
                    UtilsModule.addLog('❌ Start Processing blocked: ' + msg);
                    return;
                }
                UtilsModule.addLog('✅ LLM connected. Starting queue.');
            }

            state.autoProcess = true;
            this.maybeProcess();
        },

        async processItem(itemId) {
            const state = getState();
            const item = state.items.find(i => i.id === itemId && i.status === 'pending');
            if (!item) return;
            state.activeCount++;
            item.status = 'processing';
            item.updatedAt = Date.now();
            this.render();

            const pendingCount = state.items.filter(i => i.status === 'pending').length + state.items.filter(i => i.status === 'processing').length;
            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog(`▶️ Starting queue item: ${item.displayName || item.id} (${pendingCount} in progress)`);
            }

            try {
                const identifyStart = Date.now();
                const identifyResult = await this.identifyProduct(item);
                item.identifyResult = identifyResult;
                item.logs.push(`Identified in ${Date.now() - identifyStart}ms`);

                const candidate = pickCandidate(identifyResult.productData);
                item.candidate = candidate;
                item.productName = candidate?.name || 'Unknown product';

                const analysisStart = Date.now();
                item.analysis = await this.generateAnalysisText(item, candidate);
                item.logs.push(`Analysis ready in ${Date.now() - analysisStart}ms`);

                const pricingStart = Date.now();
                item.pricing = await this.generatePricing(item);
                item.logs.push(`Pricing ready in ${Date.now() - pricingStart}ms`);

                const salesStart = Date.now();
                item.salesText = await this.generateSalesText(item);
                item.logs.push(`Sales text ready in ${Date.now() - salesStart}ms`);

                item.status = 'ready';
                item.updatedAt = Date.now();

                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog(`✅ Queue item ready: ${item.productName || 'Unnamed product'}`);
                }
            } catch (error) {
                console.error('Queue processing error:', error);
                item.status = 'failed';
                item.error = error.message || 'Unexpected error';
                item.updatedAt = Date.now();
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.addLog(`❌ Queue item failed: ${item.error}`);
                }
            } finally {
                state.activeCount--;
                this.render();
                this.maybeProcess();
            }
        },

        async identifyProduct(item) {
            const formData = new FormData();
            formData.append('image', item.blob, `${item.id}.jpg`);
            const timeoutMs = 90000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            let response;
            try {
                response = await fetch('/identify-product', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    throw new Error(`Identify request timed out after ${timeoutMs / 1000}s. Check server and LLM connection.`);
                }
                throw err;
            }
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Identify failed: ${errorText}`);
            }
            return response.json();
        },

        async generateAnalysisText(item, candidate) {
            if (!candidate) {
                return item.identifyResult.analysis || '';
            }
            const response = await fetch('/generate-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidate,
                    googleVisionData: item.identifyResult.productData,
                    userHint: null
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Analysis failed: ${errorText}`);
            }
            const data = await response.json();
            return data.analysis;
        },

        async generatePricing(item) {
            const response = await fetch('/generate-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis: item.analysis,
                    confirmedProductName: item.productName || null,
                    userHint: null
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Pricing failed: ${errorText}`);
            }
            const data = await response.json();
            return data.pricing;
        },

        async generateSalesText(item) {
            const response = await fetch('/generate-sales-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis: item.analysis,
                    pricing: item.pricing,
                    confirmedProductName: item.productName || null,
                    additionalHints: null,
                    confirmedProductNotes: null,
                    userHint: null
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sales text failed: ${errorText}`);
            }
            const data = await response.json();
            return data.salesText;
        },

        sendToManualReview(itemId) {
            const state = getState();
            const item = state.items.find(i => i.id === itemId);
            if (!item) return;
            if (this.elements.toggle) {
                this.elements.toggle.checked = false;
            }
            this.setQueueMode(false);

            if (typeof ProductIdentificationModule !== 'undefined') {
                ProductIdentificationModule.clearResults();
            }
            if (typeof CameraModule !== 'undefined') {
                CameraModule.stopCamera();
                CameraModule.resetCameraContainerToVideo();
                CameraModule.hideCameraButtons();
            }

            const cameraContainer = document.getElementById('cameraContainer');
            const video = document.getElementById('video');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');

            if (cameraContainer) {
                cameraContainer.querySelectorAll('img').forEach(img => img.remove());
                const img = document.createElement('img');
                img.src = item.previewUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '15px';
                img.style.display = 'block';
                cameraContainer.appendChild(img);
            }

            if (video) video.style.display = 'none';
            if (cameraPlaceholder) cameraPlaceholder.classList.add('hidden');

            window.SalesApp.capturedImage = item.blob;
            if (typeof ProductIdentificationModule !== 'undefined') {
                ProductIdentificationModule.updateStepActions(1);
                ProductIdentificationModule.updateIdentifyButtonState();
            }

            item.status = 'manual';
            item.updatedAt = Date.now();
            this.render();

            if (typeof UtilsModule !== 'undefined') {
                UtilsModule.addLog('✋ Sent queue item to manual reprocessing.');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        retryItem(itemId) {
            const state = getState();
            const item = state.items.find(i => i.id === itemId);
            if (!item) return;
            item.status = 'pending';
            item.error = null;
            item.updatedAt = Date.now();
            this.render();
            this.maybeProcess();
        },

        async sendToSalesSite(itemId) {
            const state = getState();
            const item = state.items.find(i => i.id === itemId);
            if (!item || item.status !== 'ready') return;
            if (!item.analysis || !item.pricing || !item.salesText) {
                if (typeof UtilsModule !== 'undefined') {
                    UtilsModule.showError('Item is not ready to send. Missing required data.');
                }
                return;
            }

            try {
                const loading = document.getElementById('loading');
                const loadingText = document.getElementById('loadingText');
                if (loading) loading.style.display = 'block';
                if (loadingText) loadingText.textContent = 'Creating item in sales site...';

                const formData = new FormData();
                formData.append('analysis', item.analysis);
                formData.append('pricing', JSON.stringify(item.pricing));
                formData.append('salesText', item.salesText);
                formData.append('productName', item.productName || 'Unknown Product');
                
                if (item.blob) {
                    formData.append('image', item.blob, `${item.id}.jpg`);
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
                    if (typeof UtilsModule !== 'undefined') {
                        UtilsModule.showSuccess(`Item "${result.item.title}" created successfully in sales site!`);
                    }
                    // Optionally mark item as sent or remove it
                    // item.status = 'sent';
                    // this.render();
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

        removeItem(itemId) {
            const state = getState();
            const index = state.items.findIndex(i => i.id === itemId);
            if (index === -1) return;
            const [removed] = state.items.splice(index, 1);
            if (removed?.previewUrl) {
                URL.revokeObjectURL(removed.previewUrl);
            }
            this.render();
        },

        clearQueue() {
            const state = getState();
            if (!state.items.length) return;
            if (typeof window.confirm === 'function') {
                const ok = window.confirm('Clear all queued items?');
                if (!ok) return;
            }
            state.items.forEach(item => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
            state.items = [];
            this.render();
        },

        render() {
            const state = getState();
            const stats = {
                pending: state.items.filter(i => i.status === 'pending').length,
                processing: state.items.filter(i => i.status === 'processing').length,
                ready: state.items.filter(i => i.status === 'ready').length,
                failed: state.items.filter(i => i.status === 'failed').length
            };

            if (this.elements.pendingStat) this.elements.pendingStat.textContent = `Pending: ${stats.pending}`;
            if (this.elements.processingStat) this.elements.processingStat.textContent = `Processing: ${stats.processing}`;
            if (this.elements.readyStat) this.elements.readyStat.textContent = `Ready for review: ${stats.ready}`;
            if (this.elements.failedStat) this.elements.failedStat.textContent = `Failed: ${stats.failed}`;

            const isActive = state.activeCount > 0;

            if (this.elements.processBtn) {
                const hasPending = stats.pending > 0;
                this.elements.processBtn.disabled = !hasPending && !isActive;
                this.elements.processBtn.textContent = isActive
                    ? `Processing… (${state.activeCount}/${state.maxConcurrent})`
                    : 'Start Processing';
            }

            if (this.elements.clearBtn) {
                this.elements.clearBtn.disabled = state.items.length === 0 || isActive;
            }

            if (this.elements.statusBadge && !state.enabled) {
                this.elements.statusBadge.textContent = isActive ? STATUS_LABELS.processing : STATUS_LABELS.idle;
                this.elements.statusBadge.style.background = '#e9ecef';
                this.elements.statusBadge.style.color = '#6c757d';
            } else if (this.elements.statusBadge && state.enabled) {
                this.elements.statusBadge.textContent = isActive ? 'Processing' : STATUS_LABELS.armed;
            }

            if (!this.elements.itemsContainer || !this.elements.emptyState) return;

            if (!state.items.length) {
                this.elements.emptyState.style.display = 'block';
                this.elements.itemsContainer.innerHTML = '';
                this.elements.itemsContainer.appendChild(this.elements.emptyState);
                return;
            }

            this.elements.emptyState.style.display = 'none';
            this.elements.itemsContainer.innerHTML = state.items.map(item => this.renderItem(item)).join('');
        },

        renderItem(item) {
            const priceSummary = item.pricing
                ? `${item.pricing.usedPrice || ''}${item.pricing.newPrice ? ` | ${item.pricing.newPrice}` : ''}`
                : 'Pricing pending';
            const reason = item.salesText
                ? truncate(item.salesText)
                : item.status === 'failed'
                    ? `Failed: ${item.error || 'Unknown error'}`
                    : 'Waiting on pricing & sales text...';
            const statusLabel = item.status === 'ready'
                ? 'Ready'
                : item.status === 'processing'
                    ? 'Processing'
                    : item.status === 'failed'
                        ? 'Failed'
                        : item.status === 'manual'
                            ? 'Manual review'
                            : 'Pending';

            const actions = [];
            if (item.status === 'ready') {
                actions.push('<button data-action="send">Send to Sales</button>');
                actions.push('<button data-action="manual">Manual reprocess</button>');
            } else if (item.status === 'failed') {
                actions.push('<button data-action="retry">Retry</button>');
            }
            actions.push('<button data-action="remove">Remove</button>');

            return `
                <div class="queue-item" data-item-id="${item.id}" data-status="${item.status}">
                    <div class="queue-thumb" style="background-image: url('${item.previewUrl}')">
                        <span class="queue-thumb-badge">${statusLabel}</span>
                    </div>
                    <div class="queue-item-body">
                        <div class="queue-item-top">
                            <div class="queue-item-title">${escapeHtml(item.productName || item.displayName || 'Queued item')}</div>
                            <div class="queue-item-time">${timeAgo(item.updatedAt || item.createdAt)}</div>
                        </div>
                        <div class="queue-item-meta">
                            <span>💰 ${escapeHtml(priceSummary)}</span>
                            <span>🕒 ${item.logs?.length ? item.logs[item.logs.length - 1] : 'Waiting'}</span>
                        </div>
                        <div class="queue-item-reason">${escapeHtml(reason)}</div>
                        <div class="queue-item-actions">
                            ${actions.join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.QueueModule = QueueModule;
})();
