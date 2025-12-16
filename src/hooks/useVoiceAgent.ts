import { useState, useRef, useCallback } from 'react'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'speaking'

export interface LogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'system' | 'user' | 'assistant' | 'error'
}

export interface VoiceAgentConfig {
  sttModel: string
  llmModel: string
  ttsModel: string
  behaviorGuide: string
  scriptGuide: string
}

// Deepgram STT models
export const STT_MODELS = [
  { id: 'nova-3', name: 'Nova 3', desc: 'Latest, most accurate' },
  { id: 'nova-2', name: 'Nova 2', desc: 'Fast and accurate' },
  { id: 'nova', name: 'Nova', desc: 'Original Nova' },
  { id: 'enhanced', name: 'Enhanced', desc: 'High accuracy' },
  { id: 'base', name: 'Base', desc: 'Fast, lower accuracy' },
]

// LLM models (via Deepgram - supports OpenAI models)
export const LLM_MODELS = [
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', desc: 'Latest mini, fast' },
  { id: 'gpt-5', name: 'GPT-5', desc: 'Latest flagship' },
  { id: 'gpt-5.2', name: 'GPT-5.2', desc: 'Most capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Previous gen mini' },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Previous gen' },
]

// Deepgram TTS voices (Aura)
export const TTS_MODELS = [
  { id: 'aura-asteria-en', name: 'Asteria', desc: 'Female, American' },
  { id: 'aura-luna-en', name: 'Luna', desc: 'Female, American' },
  { id: 'aura-stella-en', name: 'Stella', desc: 'Female, American' },
  { id: 'aura-athena-en', name: 'Athena', desc: 'Female, British' },
  { id: 'aura-hera-en', name: 'Hera', desc: 'Female, American' },
  { id: 'aura-orion-en', name: 'Orion', desc: 'Male, American' },
  { id: 'aura-arcas-en', name: 'Arcas', desc: 'Male, American' },
  { id: 'aura-perseus-en', name: 'Perseus', desc: 'Male, American' },
  { id: 'aura-angus-en', name: 'Angus', desc: 'Male, Irish' },
  { id: 'aura-orpheus-en', name: 'Orpheus', desc: 'Male, American' },
  { id: 'aura-helios-en', name: 'Helios', desc: 'Male, British' },
  { id: 'aura-zeus-en', name: 'Zeus', desc: 'Male, American' },
]

export const DEFAULT_CONFIG: VoiceAgentConfig = {
  sttModel: 'nova-3',
  llmModel: 'gpt-5-mini',
  ttsModel: 'aura-asteria-en',
  behaviorGuide: `You are a professional recruiter conducting a behavioral interview for a senior technical role. Your goal is to get SPECIFIC, CONCRETE examples from candidates.

CORE PRINCIPLE:
Get a real example with some specifics. Don't over-interrogate. Know when to move on.

ANSWER CLASSIFICATION:
1. BULLSHIT = No example at all. Generic statements, platitudes, avoidance, hypotheticals, humble-brags.
   Examples: "I'm a natural leader", "Communication is key", "I don't really have conflicts", "I'm a perfectionist"

2. VAGUE = Has an example but lacks context. Uses "we" without YOUR role, no timeframe, no stakes.
   Examples: "There was this project last year where things got complicated and we adapted"

3. INCOMPLETE = Has example + context but missing hard data. Acceptable but could be better.
   Examples: Has project name + personal actions, but no metrics or outcome numbers

4. GOOD = Has example + YOUR actions + some concrete detail (date OR metric OR outcome). ACCEPT IT.

FOLLOW-UP ESCALATION (one question per turn, each type MAX ONCE):

Step 1 - If BULLSHIT → Ask for a specific example
"Could you walk me through one specific situation where this happened?"

Step 2 - If VAGUE → Ask for precision
"What was YOUR specific role in that? What actions did you personally take?"

Step 3 - If INCOMPLETE → Ask for data (optional, then move on regardless)
"What was the concrete outcome — any numbers or measurable results?"

IMPORTANT:
- If answer is already not bullshit and not vague → skip to Step 3, then move on
- After Step 3 (or 3 follow-ups total) → MOVE TO NEXT QUESTION, even if still incomplete
- ONE short question per follow-up. Never multiple numbered questions.
- Acknowledge good answers briefly: "Thanks, that's helpful." → next question

LISTENING RULE:
Before asking for data, check if the candidate already provided it. Don't re-ask for information they just gave you.

TONE:
- Warm but direct
- No filler phrases ("That's great!", "Interesting!")
- Keep follow-ups to 1-2 sentences max`,
  scriptGuide: `Follow this sequence. Ask each question, probe as needed (max 3 follow-ups), then move to next.

QUESTION 1 - Leadership:
"Can you tell me about a specific time when you had to lead a team through a difficult situation?"

QUESTION 2 - Conflict:
"Describe a situation where you had a significant disagreement with a colleague. How did you handle it?"

QUESTION 3 - Failure:
"Tell me about a professional failure and what you learned from it."

CLOSING:
After all 3 questions, say: "Thank you, that concludes our interview. Do you have any questions for me?"`,
}

const DEEPGRAM_API_KEY = 'b3e5ecf7ab87ac8723722ae14a0d7f558f479ccb'
const VOICE_AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse'

function createWavHeader(dataLength: number): ArrayBuffer {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const sampleRate = 48000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8

  view.setUint32(0, 0x52494646, false)
  view.setUint32(4, 36 + dataLength, true)
  view.setUint32(8, 0x57415645, false)
  view.setUint32(12, 0x666d7420, false)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  view.setUint32(36, 0x64617461, false)
  view.setUint32(40, dataLength, true)

  return header
}

export function useVoiceAgent() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [config, setConfig] = useState<VoiceAgentConfig>(DEFAULT_CONFIG)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null)

  const log = useCallback((message: string, type: LogEntry['type'] = 'system') => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      type,
    }
    setLogs(prev => [...prev, entry])
    console.log(message)
  }, [])

  const playAudio = useCallback(async (blob: Blob) => {
    const pcmData = await blob.arrayBuffer()

    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext()
      nextPlayTimeRef.current = playbackContextRef.current.currentTime
      // Create analyser for playback audio visualization
      playbackAnalyserRef.current = playbackContextRef.current.createAnalyser()
      playbackAnalyserRef.current.fftSize = 256
      playbackAnalyserRef.current.smoothingTimeConstant = 0.8
      playbackAnalyserRef.current.connect(playbackContextRef.current.destination)
    }

    const playbackContext = playbackContextRef.current
    const wavHeader = createWavHeader(pcmData.byteLength)
    const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength)
    wavBuffer.set(new Uint8Array(wavHeader), 0)
    wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength)

    try {
      const audioBuffer = await playbackContext.decodeAudioData(wavBuffer.buffer)
      const bufferSource = playbackContext.createBufferSource()
      bufferSource.buffer = audioBuffer
      // Connect through the analyser for visualization
      if (playbackAnalyserRef.current) {
        bufferSource.connect(playbackAnalyserRef.current)
      } else {
        bufferSource.connect(playbackContext.destination)
      }

      const startTime = Math.max(nextPlayTimeRef.current, playbackContext.currentTime)
      bufferSource.start(startTime)
      nextPlayTimeRef.current = startTime + audioBuffer.duration
    } catch (err) {
      log(`Playback error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
  }, [log])

  const startAudioCapture = useCallback(() => {
    if (!mediaStreamRef.current) return

    audioContextRef.current = new AudioContext({ sampleRate: 48000 })
    sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
    processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1)

    // Create analyser for input audio visualization
    analyserRef.current = audioContextRef.current.createAnalyser()
    analyserRef.current.fftSize = 256
    analyserRef.current.smoothingTimeConstant = 0.8
    sourceRef.current.connect(analyserRef.current)

    processorRef.current.onaudioprocess = (e) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }
        wsRef.current.send(pcm16.buffer)
      }
    }

    sourceRef.current.connect(processorRef.current)
    processorRef.current.connect(audioContextRef.current.destination)
    log('Audio capture started')
  }, [log])

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    nextPlayTimeRef.current = 0
  }, [])

  const start = useCallback(async () => {
    try {
      log('Requesting microphone access...')
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      log('Microphone access granted')

      setStatus('connecting')
      log('Connecting...')

      wsRef.current = new WebSocket(VOICE_AGENT_URL, ['token', DEEPGRAM_API_KEY])

      wsRef.current.onopen = () => {
        log('WebSocket connected')

        // Concatenate behavior and script guides into full system prompt
        const fullPrompt = `=== BEHAVIOR GUIDE ===\n${config.behaviorGuide}\n\n=== SCRIPT GUIDE ===\n${config.scriptGuide}`

        const settings = {
          type: 'Settings',
          audio: {
            input: { encoding: 'linear16', sample_rate: 48000 },
            output: { encoding: 'linear16', sample_rate: 48000, container: 'none' },
          },
          agent: {
            listen: { provider: { type: 'deepgram', model: config.sttModel } },
            think: {
              provider: { type: 'open_ai', model: config.llmModel },
              prompt: fullPrompt,
            },
            speak: { provider: { type: 'deepgram', model: config.ttsModel } },
          },
        }

        wsRef.current?.send(JSON.stringify(settings))
        log('Settings sent')
        startAudioCapture()
      }

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          playAudio(event.data)
        } else {
          const data = JSON.parse(event.data)

          if (data.type === 'Welcome') {
            setStatus('connected')
            log('Ready! Start speaking...')
          } else if (data.type === 'ConversationText') {
            if (data.role === 'user') {
              log(`You: ${data.content}`, 'user')
            } else if (data.role === 'assistant') {
              log(`Assistant: ${data.content}`, 'assistant')
            }
          } else if (data.type === 'UserStartedSpeaking') {
            setStatus('speaking')
          } else if (data.type === 'AgentStartedSpeaking') {
            setStatus('speaking')
          } else if (data.type === 'AgentAudioDone') {
            setStatus('connected')
          } else if (data.type === 'Error') {
            log(`Error: ${JSON.stringify(data)}`, 'error')
          }
        }
      }

      wsRef.current.onerror = () => {
        log('WebSocket error', 'error')
      }

      wsRef.current.onclose = (event) => {
        log(`Disconnected (${event.code})`)
        setStatus('disconnected')
        cleanup()
      }
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      setStatus('disconnected')
    }
  }, [log, startAudioCapture, playAudio, cleanup, config])

  const stop = useCallback(() => {
    cleanup()
    setStatus('disconnected')
    log('Stopped')
  }, [cleanup, log])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const updateConfig = useCallback((updates: Partial<VoiceAgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Get audio levels for visualization
  const getAudioData = useCallback(() => {
    const inputData = new Uint8Array(128)
    const outputData = new Uint8Array(128)

    if (analyserRef.current) {
      analyserRef.current.getByteFrequencyData(inputData)
    }
    if (playbackAnalyserRef.current) {
      playbackAnalyserRef.current.getByteFrequencyData(outputData)
    }

    return { inputData, outputData }
  }, [])

  return {
    status,
    logs,
    config,
    start,
    stop,
    clearLogs,
    updateConfig,
    getAudioData,
    isConnected: status !== 'disconnected',
  }
}
