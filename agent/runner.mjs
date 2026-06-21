/**
 * Agent runner — wires the Cline SDK Agent to LM Studio and runs it.
 *
 * What happens when runSalesAgent() is called:
 *
 *  1. We fetch the available categories from MongoDB so the system prompt
 *     can include the exact list the LLM should pick from.
 *
 *  2. We build an `Agent` (= AgentRuntime) from @cline/sdk with:
 *       - providerId: "lmstudio"  — tells the SDK to talk to LM Studio
 *       - modelId: your Gemma model
 *       - baseUrl: LM Studio's local server (default: http://localhost:1234)
 *       - systemPrompt: instructions + category list
 *       - tools: the three tools from tools.mjs
 *       - maxIterations: safety cap (each tool call = 1 iteration)
 *
 *  3. We subscribe to events so the Express controller can stream progress
 *     to the browser via SSE.
 *
 *  4. We call agent.run() with the user's message, which includes the image
 *     as a multimodal content part — Gemma 4 is a vision model so it sees it.
 *
 *  5. The SDK drives the loop until submit_result fires (completesRun: true).
 */

import { Agent } from '@cline/sdk';
import { createRequire } from 'module';
import { createSalesTools } from './tools.mjs';

const require = createRequire(import.meta.url);
const itemService = require('../services/itemService.js');

function buildSystemPrompt(categories) {
  const categoryList =
    categories.length > 0 ? categories.map((c) => c.name).join(', ') : 'Uncategorized';

  return `You are a sales assistant for Onisad, an Irish second-hand marketplace.

Your job when given a product image:
1. Call get_vision_labels to enrich your understanding with Google Vision data.
2. Identify the product: brand, model, variant, visible condition. Be specific.
3. Estimate the current Irish market price (Done Deal / Facebook Marketplace rates).
   State both a new retail reference price and a realistic used/second-hand asking price.
4. Write a short, friendly 2–3 sentence sales description in plain text (no markdown).
   ALWAYS end the description with exactly this line:
   "No offer below asking. No split, no swap! Cash or Paypal/Revolut and collection only!"
5. Call create_listing with all the details.
6. Call submit_result to end the session.

Available categories (use one of these names exactly): ${categoryList}

Rules:
- Be honest about condition — buyers can see the image.
- Prices should be realistic for Ireland, not inflated brand-new retail.
- Sales description: plain text only, no asterisks, no bullet points.
- If you cannot confidently identify the product, describe what you see and use "Uncategorized".
`;
}

/**
 * Run the sales agent for one image.
 *
 * @param {Buffer}   imageBuffer  - Raw image bytes from the upload.
 * @param {string}   base64Image  - Base64-encoded image (passed to the LLM).
 * @param {string}   mimeType     - MIME type of the image, e.g. "image/jpeg".
 * @param {string}   [hint]       - Optional user hint about the product.
 * @param {Function} onEvent      - Called with each AgentRuntimeEvent.
 * @returns {Promise<AgentRunResult>}
 */
export async function runSalesAgent(imageBuffer, base64Image, mimeType, hint, onEvent) {
  const categories = await itemService.getAllCategories();
  const systemPrompt = buildSystemPrompt(categories);
  const tools = createSalesTools(imageBuffer);

  const agent = new Agent({
    // "lmstudio" is a built-in Cline provider — the SDK knows how to talk to it.
    // LM Studio exposes an OpenAI-compatible HTTP API at http://localhost:1234.
    providerId: process.env.LM_STUDIO_PROVIDER_ID || 'lmstudio',
    modelId: process.env.LM_STUDIO_MODEL || 'google/gemma-4-26b-a4b-qat',
    baseUrl: process.env.LM_STUDIO_URL || 'http://localhost:1234',
    // LM Studio doesn't require a real API key; any non-empty string works.
    apiKey: process.env.LM_STUDIO_API_KEY || 'lm-studio',

    systemPrompt,
    tools,

    // Safety cap: each LLM turn + each tool call each cost one iteration.
    // 3 tools × ~2 turns between calls + buffer = 15 is plenty.
    maxIterations: 15,
  });

  // Subscribe before calling run() so we don't miss the run-started event.
  agent.subscribe(onEvent);

  // Build the initial user message with the image embedded.
  // AgentMessage.content is an array of typed parts; AgentImagePart carries
  // the raw image so Gemma 4's vision head can process it directly.
  const userMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: [
      {
        type: 'image',
        image: base64Image,      // base64 string — AgentImagePart accepts this
        mediaType: mimeType,     // tells the SDK (and the model) the format
      },
      {
        type: 'text',
        text: `Create a sales listing for this item.${hint ? ` User note: "${hint}"` : ''}`,
      },
    ],
  };

  return await agent.run(userMessage);
}
