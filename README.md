# Sales Agent

A mobile-friendly web app that takes a photo of a second-hand item and — using an agentic AI loop — identifies it, prices it for the Irish market, writes a sales description, and creates a draft listing in the Onisad sales site.

## How it works (the agentic loop)

The core of this project is a [Cline SDK](https://docs.cline.bot/sdk/overview) agent running a local LLM via [LM Studio](https://lmstudio.ai). Instead of a hardcoded pipeline, the LLM drives the process:

```
Photo uploaded
      │
      ▼
POST /agent/run  ──────────────────────────────────────────────────────────────┐
      │                                                                        │
      ▼                                                             SSE stream │
  Cline Agent (Gemma 4 via LM Studio)                           back to browser│
      │                                                                        │
      ├─ sees the image in the initial message (multimodal)                    │
      │                                                                        │
      ├─ calls tool: get_vision_labels  ← Google Vision API                   │
      │   └─ returns: labels, web guesses, visible text                       │
      │                                                                        │
      ├─ reasons about the product, price, sales text  (LLM reasoning)        │
      │                                                                        │
      ├─ calls tool: create_listing  ← writes draft to MongoDB                │
      │                                                                        │
      └─ calls tool: submit_result  ← ends the loop ─────────────────────────┘
```

Each tool call and the model's thinking stream back to the browser in real time via [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js |
| Agentic runtime | [@cline/sdk](https://www.npmjs.com/package/@cline/sdk) |
| Local LLM | LM Studio (`google/gemma-4-26b-a4b-qat`) |
| Vision labels | Google Cloud Vision API |
| Database | MongoDB (shared with sales site) |
| Frontend | Pug templates + vanilla JS |

## Setup

### 1. LM Studio

- Download [LM Studio](https://lmstudio.ai) and load a multimodal model (tested with `google/gemma-4-26b-a4b-qat`)
- Enable the local server on **port 1234** (the default)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp env.example .env
```

Key variables:

```env
# LM Studio
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=google/gemma-4-26b-a4b-qat

# Google Vision (optional but recommended)
GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json

# Sales site database
SALES_SITE_MONGODB_URI=mongodb+srv://...
SALES_SITE_URL=http://localhost:3004
```

See `env.example` for the full list.

### 4. Start

```bash
npm start        # production
npm run dev      # with nodemon
```

Navigate to `http://localhost:3000`.

## Agent endpoint

```
POST /agent/run
Content-Type: multipart/form-data

Fields:
  image   (file)    — product photo
  hint    (string)  — optional, e.g. "board game"
```

Response: `text/event-stream` — each line is a JSON event:

| Event type | Payload | Meaning |
|-----------|---------|---------|
| `run-started` | — | Agent loop began |
| `thinking` | `{ text }` | Model chain-of-thought |
| `text` | `{ text }` | Model spoken output |
| `tool-started` | `{ tool, input }` | Tool call initiated |
| `tool-finished` | `{ tool, output }` | Tool call completed |
| `run-finished` | `{ outputText, iterations }` | Loop ended successfully |
| `error` | `{ message }` | Something went wrong |

## Agent tools (what the LLM can do)

Defined in `agent/tools.mjs`:

| Tool | What it does |
|------|-------------|
| `get_vision_labels` | Calls Google Vision API, returns labels + web guesses |
| `create_listing` | Saves the draft listing to MongoDB |
| `submit_result` | Ends the agent loop (`completesRun: true`) |

All text generation — product identification, pricing, sales description — is done by the LLM itself through reasoning, not by separate prompt calls.

## Project structure

```
├── agent/
│   ├── tools.mjs           # Cline SDK tool definitions (ESM)
│   ├── runner.mjs          # Agent factory + run function (ESM)
│   └── agentController.js  # Express route, SSE streaming (CJS)
├── controllers/            # Original sequential endpoints (still available)
├── services/itemService.js # MongoDB operations
├── utils/prompts.js        # Prompt templates (used by legacy endpoints)
├── views/                  # Pug templates
└── public/js/              # Frontend JavaScript
```

## Legacy endpoints

The original step-by-step endpoints (`/product/identify-product`, `/pricing/generate-pricing`, `/sales/generate-sales-text`, `/item/`) are still available and unchanged. They use Open WebUI/Ollama via the `OPEN_WEBUI_URL` env var.

## Requirements

- Node.js 22+
- LM Studio with a multimodal model
- MongoDB Atlas or local instance
- Google Cloud Vision API key (optional)
