# Audio Agent Dojo

Voice AI experimentation playground using Deepgram's Voice Agent API.

## Quick Start

### 1. Get a Deepgram API Key

1. Create an account at [console.deepgram.com](https://console.deepgram.com)
2. Go to **API Keys** and create a new key
3. Copy the key (you won't see it again)

> Docs: [Deepgram Voice Agent API](https://developers.deepgram.com/docs/voice-agent)

### 2. Configure

Create a `.env` file in the project root:

```bash
VITE_DEEPGRAM_API_KEY=your_api_key_here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Start Conversation**.

## Features

- Real-time voice conversation with AI
- Configurable system prompts (Behavior Guide + Script Guide)
- Real-time audio visualization (mic input + agent output)
- Model selection: STT, LLM, TTS
- Events log with semantic colors
- Conversation transcript

## Default Prompt

The default configuration is a **behavioral interview recruiter** that:
- Asks leadership, conflict, and failure questions
- Pushes for specific, concrete examples
- Classifies answers (bullshit → vague → incomplete → good)
- Knows when to move on

Edit prompts via the **Brain icon** in the header.

## Tech Stack

- Vite + React 19 + TypeScript
- Tailwind CSS
- Deepgram Voice Agent API
  - STT: Nova-3
  - TTS: Aura voices
  - LLM: OpenAI GPT-5 (via Deepgram)

## Browser Requirements

- Modern browser with WebRTC support
- Microphone access permission
