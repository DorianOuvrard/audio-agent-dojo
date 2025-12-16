# audio-agent-dojo

Voice AI experimentation playground.

## Stack

- **Vite + React 19** - Fast dev server and build
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **STT/TTS**: Deepgram Voice Agent API (Nova-3 / Aura)
- **LLM**: OpenAI GPT-5 (via Deepgram)

## Run

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── hooks/           # Custom hooks (useVoiceAgent)
├── lib/             # Utilities (cn helper)
├── App.tsx          # Main application
├── index.css        # Tailwind styles
└── main.tsx         # Entry point
```
