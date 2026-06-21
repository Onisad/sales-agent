// Utility functions module
window.UtilsModule = {
    // Function to show error messages
    showError: function (message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;

        const content = document.querySelector('.content');
        content.insertBefore(errorDiv, content.firstChild);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    },

    // Function to show success messages
    showSuccess: function (message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.style.cssText = 'background: #d4edda; color: #155724; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #c3e6cb;';
        successDiv.textContent = message;

        const content = document.querySelector('.content');
        content.insertBefore(successDiv, content.firstChild);

        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    },

    // Function to add logs to the live log section
    addLog: function (message, type = 'info') {
        const logDetails = document.getElementById('logDetails');
        const logContent = document.getElementById('logContent');

        if (logDetails && logContent) {
            // Store current open state
            const wasOpen = logDetails.open;

            // Add timestamp and format the message
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}\n`;

            // Add to log content
            logContent.textContent += logEntry;

            // Explicitly keep it closed if it wasn't open by user
            // This prevents auto-expansion when content changes
            if (!wasOpen) {
                logDetails.open = false;
            }

            // Auto-scroll to bottom only if already expanded
            if (logDetails.open) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        }

        // Also log to console
        console.log(message);
    },

    // Function to update content padding based on results visibility
    updateContentPadding: function () {
        const results = document.getElementById('results');
        const content = document.querySelector('.content');
        if (results && content) {
            const isResultsVisible = results.style.display === 'block';
            if (isResultsVisible) {
                content.classList.remove('no-results');
            } else {
                content.classList.add('no-results');
            }
        }
    },

    // Function to send client errors to the server
    logClientErrorToServer: function (message, stack) {
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
    },

    // Check LLM server status
    checkLLMStatus: async function () {
        console.log('🔍 Checking LLM server status...');
        try {
            const response = await fetch('/health/llm');
            const status = await response.json();
            window.SalesApp.llmStatus = status;
            console.log('📊 LLM status:', status);
            return status.available;
        } catch (error) {
            console.error('❌ Failed to check LLM status:', error);
            window.SalesApp.llmStatus = { available: false, error: error.message };
            return false;
        }
    },

    // Check sales site database status
    checkSalesSiteStatus: async function () {
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
    },

    // Update UI based on LLM status (header + alert banner). Status is only set when user clicks Start Processing.
    updateLLMStatusUI: function () {
        const status = window.SalesApp && window.SalesApp.llmStatus;
        const statusIndicator = document.getElementById('llmStatus');
        const alertBanner = document.getElementById('connectionAlert');
        const alertText = document.getElementById('connectionAlertText');
        const alertIcon = alertBanner && alertBanner.querySelector('.connection-alert-icon');

        if (statusIndicator) {
            if (status && status.available) {
                statusIndicator.innerHTML = '🟢 LLM server is running';
                statusIndicator.style.color = '#28a745';
                statusIndicator.title = '';
            } else if (status && status.available === false) {
                const reason = (status.message || status.error) || 'Unknown error';
                statusIndicator.innerHTML = '🔴 LLM server is not available';
                statusIndicator.style.color = '#dc3545';
                statusIndicator.title = reason;
            } else {
                statusIndicator.innerHTML = '⚪ LLM: checked when you start processing';
                statusIndicator.style.color = '#6c757d';
                statusIndicator.title = 'Connection is checked when you click Start Processing';
            }
        }

        if (alertBanner && alertText) {
            if (status && status.available) {
                alertBanner.style.display = 'none';
            } else if (status && status.available === false) {
                const reason = (status.message || status.error) || 'Cannot reach LLM server.';
                if (alertIcon) alertIcon.textContent = '⚠️';
                alertText.textContent = 'LLM server is not available. ' + reason + ' Use Retry connection after fixing.';
                alertBanner.style.display = 'block';
            } else {
                alertBanner.style.display = 'none';
            }
        }
    },

    // Re-check LLM and update UI (e.g. after "Retry connection")
    recheckLLMAndUpdate: async function () {
        const retryBtn = document.getElementById('connectionAlertRetry');
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.textContent = 'Checking…';
        }
        await this.checkLLMStatus();
        this.updateLLMStatusUI();
        this.addLog(window.SalesApp.llmStatus && window.SalesApp.llmStatus.available ? '✅ LLM connection restored.' : '❌ LLM still unavailable: ' + (window.SalesApp.llmStatus?.message || window.SalesApp.llmStatus?.error || 'Unknown'));
        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.textContent = 'Retry connection';
        }
        return window.SalesApp.llmStatus && window.SalesApp.llmStatus.available;
    },

    // Update UI based on sales site status
    updateSalesSiteStatusUI: function (status) {
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
    },

    // Initialize utility functions
    init: function () {
        // Global error handler
        window.onerror = function (message, source, lineno, colno, error) {
            this.logClientErrorToServer(message, error && error.stack ? error.stack : `${source}:${lineno}:${colno}`);
        }.bind(this);

        window.addEventListener('unhandledrejection', function (event) {
            this.logClientErrorToServer(event.reason && event.reason.message ? event.reason.message : 'Unhandled rejection', event.reason && event.reason.stack ? event.reason.stack : '');
        }.bind(this));

        // Ensure log section starts closed
        const logDetails = document.getElementById('logDetails');
        if (logDetails) {
            logDetails.open = false;
        }

        // Log controls
        const clearLogs = document.getElementById('clearLogs');

        if (clearLogs) {
            clearLogs.addEventListener('click', () => {
                const logContent = document.getElementById('logContent');
                if (logContent) {
                    logContent.textContent = 'Logs cleared...\n';
                }
            });
        }

        // Initialize content padding based on initial results state
        this.updateContentPadding();
    }
};








