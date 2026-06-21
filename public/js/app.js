document.addEventListener('DOMContentLoaded', () => {

  // ── State ────────────────────────────────────────────────────────────────
  let stream = null;       // MediaStream from camera
  let capturedImage = null; // File or Blob

  // ── Elements ─────────────────────────────────────────────────────────────
  const video          = document.getElementById('video');
  const canvas         = document.getElementById('canvas');
  const cameraContainer    = document.getElementById('cameraContainer');
  const cameraPlaceholder  = document.getElementById('cameraPlaceholder');
  const startCameraBtn     = document.getElementById('startCamera');
  const capturePhotoBtn    = document.getElementById('capturePhoto');
  const uploadPhotoBtn     = document.getElementById('uploadPhoto');
  const fileInput          = document.getElementById('fileInput');
  const hintInput          = document.getElementById('hintInput');
  const createListingBtn   = document.getElementById('createListingBtn');
  const resetBtn           = document.getElementById('resetBtn');

  // Agent panel
  const agentPanel   = document.getElementById('agentPanel');
  const agentSpinner = document.getElementById('agentSpinner');
  const agentStatus  = document.getElementById('agentStatus');
  const agentLog     = document.getElementById('agentLog');
  const agentResult  = document.getElementById('agentResult');
  const agentError   = document.getElementById('agentError');
  const resultTitle  = document.getElementById('resultTitle');
  const resultPrice  = document.getElementById('resultPrice');
  const resultSalesText = document.getElementById('resultSalesText');

  // ── Status checks ────────────────────────────────────────────────────────
  async function checkStatuses() {
    // LM Studio
    try {
      const r = await fetch('/health/lmstudio');
      const d = await r.json();
      const el = document.getElementById('lmStatus');
      if (d.available) {
        const model = process.env?.LM_STUDIO_MODEL || d.models?.[0] || 'model';
        el.textContent = `🟢 AI ready`;
        el.style.color = '#a8f0c8';
      } else {
        el.textContent = `🔴 AI offline`;
        el.style.color = '#ffb3b3';
        el.title = d.error || '';
      }
    } catch { document.getElementById('lmStatus').textContent = '🔴 AI offline'; }

    // Database
    try {
      const r = await fetch('/health/db');
      const d = await r.json();
      const el = document.getElementById('dbStatus');
      if (d.connected) {
        el.textContent = `🟢 DB (${d.categories} categories)`;
        el.style.color = '#a8f0c8';
      } else {
        el.textContent = '🔴 DB offline';
        el.style.color = '#ffb3b3';
      }
    } catch { document.getElementById('dbStatus').textContent = '🔴 DB offline'; }
  }
  checkStatuses();

  // ── Image helpers ─────────────────────────────────────────────────────────
  function setImage(blob) {
    capturedImage = blob;
    // Show preview
    cameraContainer.querySelectorAll('img').forEach(i => i.remove());
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain',
                                borderRadius:'15px', display:'block' });
    video.style.display = 'none';
    cameraPlaceholder.classList.add('hidden');
    cameraContainer.appendChild(img);
    cameraContainer.classList.add('has-image');
    createListingBtn.disabled = false;
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.style.display = 'none';
    cameraContainer.classList.remove('camera-active');
    startCameraBtn.textContent = 'Start Camera';
    capturePhotoBtn.disabled = true;
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  startCameraBtn.addEventListener('click', async () => {
    if (stream) { stopCamera(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = stream;
      video.style.display = 'block';
      cameraPlaceholder.style.display = 'none';
      cameraContainer.classList.add('camera-active');
      startCameraBtn.textContent = 'Stop Camera';
      capturePhotoBtn.disabled = false;
    } catch (err) {
      showError(`Camera error: ${err.message}`);
    }
  });

  capturePhotoBtn.addEventListener('click', () => {
    if (!stream) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => { stopCamera(); setImage(blob); }, 'image/jpeg', 0.85);
  });

  uploadPhotoBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) setImage(e.target.files[0]);
  });

  // ── Agent run ─────────────────────────────────────────────────────────────
  createListingBtn.addEventListener('click', async () => {
    if (!capturedImage) return;

    // Reset panel state
    agentPanel.style.display = 'block';
    agentPanel.className = 'agent-panel running';
    agentLog.innerHTML = '';
    agentResult.style.display = 'none';
    agentError.style.display = 'none';
    agentError.textContent = '';
    agentSpinner.className = 'agent-spinner spinning';
    agentStatus.textContent = 'Agent starting…';
    createListingBtn.disabled = true;
    resetBtn.style.display = 'none';
    agentPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Accumulates the model's thinking/text output per turn
    let thinkingEl = null;
    let thinkingText = '';

    function flushThinking() {
      if (thinkingEl && thinkingText.trim()) {
        thinkingEl.textContent = thinkingText.trim();
      }
      thinkingEl = null;
      thinkingText = '';
    }

    function ensureThinkingEl() {
      if (!thinkingEl) {
        thinkingEl = document.createElement('div');
        thinkingEl.className = 'log-thinking';
        agentLog.appendChild(thinkingEl);
      }
    }

    function addToolEntry(toolName) {
      flushThinking();
      const row = document.createElement('div');
      row.className = 'log-tool';
      row.innerHTML = `<span class="tool-name">${toolLabel(toolName)}</span><span class="tool-status spinning">…</span>`;
      agentLog.appendChild(row);
      agentLog.scrollTop = agentLog.scrollHeight;
      return row;
    }

    const toolRows = {};

    // ── Stream the SSE response via fetch (EventSource only supports GET)
    const formData = new FormData();
    formData.append('image', capturedImage, 'product.jpg');
    if (hintInput.value.trim()) formData.append('hint', hintInput.value.trim());

    let finalResult = null;

    try {
      const response = await fetch('/agent/run', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          switch (event.type) {

            case 'run-started':
              agentStatus.textContent = 'Agent running…';
              break;

            case 'thinking':
              // Chain-of-thought text — streamed character by character
              ensureThinkingEl();
              thinkingText += event.text;
              thinkingEl.textContent = thinkingText;
              agentLog.scrollTop = agentLog.scrollHeight;
              break;

            case 'text':
              // Spoken model output between tool calls
              ensureThinkingEl();
              thinkingText += event.text;
              thinkingEl.textContent = thinkingText;
              agentLog.scrollTop = agentLog.scrollHeight;
              break;

            case 'tool-started': {
              flushThinking();
              const row = addToolEntry(event.tool);
              toolRows[event.tool] = row;
              agentStatus.textContent = `Calling ${toolLabel(event.tool)}…`;
              break;
            }

            case 'tool-finished': {
              flushThinking();
              const row = toolRows[event.tool];
              if (row) {
                row.querySelector('.tool-status').className = 'tool-status done';
                row.querySelector('.tool-status').textContent = '✓';
                // Show a brief summary of the tool output
                const summary = toolSummary(event.tool, event.output);
                if (summary) {
                  const detail = document.createElement('div');
                  detail.className = 'tool-detail';
                  detail.textContent = summary;
                  row.appendChild(detail);
                }
              }
              agentLog.scrollTop = agentLog.scrollHeight;
              // Capture listing result for the result card
              if (event.tool === 'create_listing' && event.output && !event.output.error) {
                finalResult = event.output;
              }
              break;
            }

            case 'run-finished':
              flushThinking();
              agentSpinner.className = 'agent-spinner done';
              agentStatus.textContent = `Done — ${event.iterations} steps`;
              showResult(finalResult, event.outputText);
              resetBtn.style.display = 'inline-block';
              break;

            case 'error':
              flushThinking();
              agentSpinner.className = 'agent-spinner error';
              agentStatus.textContent = 'Failed';
              agentError.style.display = 'block';
              agentError.textContent = `Error: ${event.message}`;
              resetBtn.style.display = 'inline-block';
              break;
          }
        }
      }
    } catch (err) {
      agentSpinner.className = 'agent-spinner error';
      agentStatus.textContent = 'Failed';
      agentError.style.display = 'block';
      agentError.textContent = `Error: ${err.message}`;
      resetBtn.style.display = 'inline-block';
    }

    createListingBtn.disabled = false;
  });

  // ── Result card ───────────────────────────────────────────────────────────
  function showResult(listing, outputText) {
    agentResult.style.display = 'block';
    if (listing) {
      resultTitle.textContent = listing.title || 'Listing created';
      resultPrice.textContent = listing.price ? `€${listing.price} — saved as draft` : 'Saved as draft';
      // Extract sales text from outputText (submit_result JSON)
      try {
        const parsed = JSON.parse(outputText);
        resultSalesText.textContent = '';
      } catch {
        resultSalesText.textContent = '';
      }
    } else {
      resultTitle.textContent = 'Listing created';
      resultPrice.textContent = 'Check your sales site for the draft.';
    }
    agentResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toolLabel(name) {
    return { get_vision_labels: '🔍 Vision labels', create_listing: '📦 Create listing',
             submit_result: '✅ Submit' }[name] || name;
  }

  function toolSummary(name, output) {
    if (!output || output.error) return output?.error ? `Error: ${output.error}` : null;
    if (name === 'get_vision_labels') {
      const labels = [...(output.bestGuessLabels || []), ...(output.detectedObjects || [])].slice(0, 4);
      return labels.length ? labels.join(', ') : null;
    }
    if (name === 'create_listing') {
      return output.title ? `"${output.title}" — €${output.price}` : null;
    }
    return null;
  }

  function showError(msg) {
    const div = document.createElement('div');
    div.className = 'error-toast';
    div.textContent = msg;
    document.querySelector('.content').prepend(div);
    setTimeout(() => div.remove(), 5000);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    capturedImage = null;
    cameraContainer.querySelectorAll('img').forEach(i => i.remove());
    cameraPlaceholder.classList.remove('hidden');
    cameraPlaceholder.style.display = '';
    cameraContainer.classList.remove('has-image');
    hintInput.value = '';
    agentPanel.style.display = 'none';
    agentPanel.className = 'agent-panel';
    resetBtn.style.display = 'none';
    createListingBtn.disabled = true;
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Forward client errors to server
  window.onerror = (message, source, lineno, colno, error) => {
    fetch('/log-client-error', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack: error?.stack, url: location.href, userAgent: navigator.userAgent })
    }).catch(() => {});
  };
});
