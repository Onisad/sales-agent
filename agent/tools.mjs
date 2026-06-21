/**
 * Sales agent tools — what the LLM can DO.
 *
 * How the Cline agent loop works:
 *   1. The LLM sees your message (+ image) and the tool list.
 *   2. It decides which tool to call and with what inputs.
 *   3. The SDK executes the tool's `execute()` function.
 *   4. The result is fed back to the LLM as a tool-result message.
 *   5. The LLM decides what to do next (call another tool, or respond).
 *   6. The loop ends when a tool with `lifecycle: { completesRun: true }` runs.
 *
 * Tools here use JavaScript closures to capture `imageBuffer` so the LLM never
 * has to pass the image bytes through its conversation — it just calls the tool
 * and the tool already has access to the buffer.
 */

import { createTool } from '@cline/sdk';
import { z } from 'zod';
import { createRequire } from 'module';

// createRequire lets an ES module import CommonJS modules (the rest of this app)
const require = createRequire(import.meta.url);
const { analyzeImageWithHint } = require('../controllers/visionController.js');
const itemService = require('../services/itemService.js');
const { extractPrice } = require('../utils/pricingHelper.js');

/**
 * Create the tool set for one agent run.
 * @param {Buffer} imageBuffer - The raw image bytes from the upload.
 */
export function createSalesTools(imageBuffer) {
  return [

    // ─── Tool 1: get_vision_labels ───────────────────────────────────────────
    // Sends the image to Google Cloud Vision and returns structured labels.
    // The LLM calls this first to get extra signal it might not catch from
    // the image alone (web matches, on-package text, object names).
    createTool({
      name: 'get_vision_labels',
      description:
        'Run Google Vision API on the product image to get object labels, web best-guess labels, and any text visible on the product. Call this first to get extra context before identifying the product.',
      inputSchema: z.object({
        hint: z
          .string()
          .optional()
          .describe("Any hint provided by the user about what the product is, e.g. 'board game' or 'Nikon camera'"),
      }),
      async execute({ hint }) {
        try {
          const result = await analyzeImageWithHint(imageBuffer, hint || null);
          return {
            detectedObjects: result.detectedObjects.slice(0, 8),
            bestGuessLabels: result.webDetection?.bestGuessLabels || [],
            extractedText: (result.extractedText || '').slice(0, 300),
            dominantColors: result.dominantColors.slice(0, 3),
            productCandidates: (result.productCandidates || []).map((c) => c.name),
          };
        } catch (err) {
          // Google Vision is optional — if it's not configured the agent
          // continues with only what it can see in the image.
          return {
            error: `Vision API unavailable: ${err.message}`,
            detectedObjects: [],
            bestGuessLabels: [],
          };
        }
      },
    }),

    // ─── Tool 2: create_listing ──────────────────────────────────────────────
    // Saves the finished listing to MongoDB as a draft.
    // The LLM calls this once it has identified the product, decided on pricing,
    // and written the sales description. All the text generation happens in the
    // LLM's own reasoning — this tool is purely the database write.
    createTool({
      name: 'create_listing',
      description:
        'Save the product listing to the sales database as a draft. Call this after you have identified the product, determined pricing, and written the sales description.',
      inputSchema: z.object({
        productName: z
          .string()
          .describe('Full product name, e.g. "Port Royal Board Game" or "Adidas Stan Smith Trainers Size 10"'),
        usedPrice: z
          .string()
          .describe('Second-hand asking price in euros, e.g. "€45"'),
        newPrice: z
          .string()
          .describe('New retail reference price in euros, e.g. "€80"'),
        salesText: z
          .string()
          .describe(
            'Complete sales description ending with: "No offer below asking. No split, no swap! Cash or Paypal/Revolut and collection only!"',
          ),
        condition: z
          .enum(['new', 'like new', 'good', 'fair', 'poor'])
          .describe('Physical condition of the item'),
        category: z
          .string()
          .describe('Category name — must match one of the available categories listed in the system prompt exactly'),
      }),
      async execute({ productName, usedPrice, newPrice, salesText, condition, category }) {
        const price = extractPrice(usedPrice) || extractPrice(newPrice) || 0;

        const result = await itemService.createItem({
          title: productName,
          description: salesText,
          price,
          condition,
          category: category || 'Uncategorized',
          isPublished: false,
          images: [imageBuffer],
        });

        if (!result.success) {
          // Return an error object instead of throwing so the LLM can
          // see what went wrong and potentially retry or adjust its input.
          return { error: result.error || 'Failed to create listing' };
        }

        return {
          listingId: result.item._id.toString(),
          title: result.item.title,
          price: result.item.price,
          status: 'draft — requires review before publishing',
        };
      },
    }),

    // ─── Tool 3: submit_result ───────────────────────────────────────────────
    // Ends the agent loop. `lifecycle: { completesRun: true }` tells the SDK
    // to stop iterating once this tool runs successfully.
    // Without a completion tool the agent would keep looping until maxIterations.
    createTool({
      name: 'submit_result',
      description:
        'Submit the final result and end the session. Call this only after create_listing has returned a listingId.',
      inputSchema: z.object({
        listingId: z.string().describe('ID returned by create_listing'),
        productName: z.string().describe('Name of the product'),
        price: z.string().describe('Listed price'),
        summary: z.string().describe('One-sentence summary of what was created'),
      }),
      lifecycle: { completesRun: true },
      async execute(input) {
        // The return value becomes the agent's final outputText.
        return JSON.stringify(input);
      },
    }),
  ];
}
