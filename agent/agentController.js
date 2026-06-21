/**
 * Agent HTTP controller — bridges Express and the Cline agent.
 *
 * POST /agent/run  (multipart/form-data)
 *   Fields: image (file), hint (optional text)
 *
 * Response: text/event-stream (Server-Sent Events)
 *
 * SSE is used instead of regular JSON because the agent loop takes several
 * seconds and produces events incrementally (thinking text, tool calls, tool
 * results). SSE lets the browser render progress in real time without polling.
 *
 * Event shapes (all JSON, sent as `data: {...}\n\n`):
 *   { type: "run-started" }
 *   { type: "thinking", text: "..." }        — model's chain-of-thought
 *   { type: "text",     text: "..." }        — model's spoken text
 *   { type: "tool-started", tool: "...", input: {...} }
 *   { type: "tool-finished", tool: "...", output: {...} }
 *   { type: "run-finished",  outputText: "...", iterations: N }
 *   { type: "error",    message: "..." }
 *
 * Note: `@cline/sdk` is an ES Module (type: "module") while the rest of this
 * app is CommonJS. The dynamic `import()` inside the async handler is the
 * standard way to consume an ESM package from a CJS file in Node.js.
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post('/run', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const { hint } = req.body;
  const imageBuffer = req.file.buffer;
  const base64Image = imageBuffer.toString('base64');
  const mimeType = req.file.mimetype || 'image/jpeg';

  // ── Set up Server-Sent Events ─────────────────────────────────────────────
  // Once these headers are flushed the connection stays open and we can push
  // events whenever the agent emits them.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Safely write one SSE event. Checks res.writableEnded in case the client
  // disconnected mid-run.
  const send = (type, payload = {}) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    }
  };

  try {
    // Dynamic import — required because runner.mjs is ESM.
    // The import is cached by Node after the first call so there's no penalty
    // on subsequent requests.
    const { runSalesAgent } = await import('./runner.mjs');

    await runSalesAgent(imageBuffer, base64Image, mimeType, hint, (event) => {
      // Map Cline SDK event types to the shapes the browser expects.
      switch (event.type) {
        case 'run-started':
          send('run-started');
          break;

        case 'assistant-reasoning-delta':
          // Chain-of-thought text — the model "thinking out loud" before acting.
          // Gemma 4 emits these when it reasons through the problem.
          send('thinking', { text: event.text ?? '' });
          break;

        case 'assistant-text-delta':
          // Spoken/visible model output (shown in the chat log).
          send('text', { text: event.text ?? '' });
          break;

        case 'tool-started':
          // The model has decided to call a tool. `input` is already validated
          // by the Zod schema we defined in tools.mjs.
          send('tool-started', {
            tool: event.toolCall.toolName,
            input: event.toolCall.input,
          });
          break;

        case 'tool-finished': {
          // Tool has returned. The result lives in the tool-result message part.
          const resultPart = event.message?.content?.find(
            (p) => p.type === 'tool-result',
          );
          send('tool-finished', {
            tool: event.toolCall.toolName,
            output: resultPart?.output ?? null,
          });
          break;
        }

        case 'run-finished':
          send('run-finished', {
            outputText: event.result.outputText,
            iterations: event.result.iterations,
          });
          break;

        case 'run-failed':
          send('error', { message: event.error?.message ?? 'Agent run failed' });
          break;

        // Remaining event types (message-added, turn-started, usage-updated …)
        // are intentionally not forwarded — the browser doesn't need them.
      }
    });
  } catch (err) {
    console.error('Agent run error:', err);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

module.exports = router;
