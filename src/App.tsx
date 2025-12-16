import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Trash2, Volume2, Radio, MessageSquare, Activity, Settings, ChevronDown, X, Wifi, AlertTriangle, User, Bot, Brain, ScrollText, Compass } from 'lucide-react'
import {
  useVoiceAgent,
  type ConnectionStatus,
  type LogEntry,
  type VoiceAgentConfig,
  STT_MODELS,
  LLM_MODELS,
  TTS_MODELS,
} from '@/hooks/useVoiceAgent'
import { cn } from '@/lib/utils'

function SoundWave({
  isActive,
  getAudioData
}: {
  isActive: boolean
  getAudioData: () => { inputData: Uint8Array; outputData: Uint8Array }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { inputData, outputData } = getAudioData()
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const barCount = 32
    const barWidth = width / barCount - 2
    const centerY = height / 2

    for (let i = 0; i < barCount; i++) {
      // Sample from frequency data (skip low frequencies, focus on voice range)
      const dataIndex = Math.floor((i / barCount) * 64) + 8
      const inputLevel = inputData[dataIndex] || 0
      const outputLevel = outputData[dataIndex] || 0

      // Combine both levels, prioritize whichever is louder
      const level = Math.max(inputLevel, outputLevel)
      const normalizedLevel = level / 255

      // Bar height based on audio level (min 4px, max half canvas height)
      const barHeight = Math.max(4, normalizedLevel * (height / 2 - 4))

      const x = i * (barWidth + 2)

      // Color based on which source is dominant
      if (outputLevel > inputLevel && outputLevel > 30) {
        // Agent speaking - blue
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0.9)')
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 1)')
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0.9)')
        ctx.fillStyle = gradient
      } else if (inputLevel > 30) {
        // User speaking - emerald
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0.9)')
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 1)')
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0.9)')
        ctx.fillStyle = gradient
      } else {
        // Idle - subtle gray
        ctx.fillStyle = isActive ? 'rgba(148, 163, 184, 0.4)' : 'rgba(203, 213, 225, 0.6)'
      }

      // Draw symmetric bar from center
      ctx.beginPath()
      ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 2)
      ctx.fill()
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [getAudioData, isActive])

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(draw)
    } else {
      // Draw idle state once
      draw()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, draw])

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={64}
      className="w-64 h-16"
    />
  )
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string; bgColor: string }> = {
  disconnected: { label: 'Ready to Connect', color: 'bg-slate-400', bgColor: 'bg-slate-100' },
  connecting: { label: 'Connecting...', color: 'bg-amber-400', bgColor: 'bg-amber-50' },
  connected: { label: 'Listening', color: 'bg-emerald-400', bgColor: 'bg-emerald-50' },
  speaking: { label: 'Speaking...', color: 'bg-blue-400', bgColor: 'bg-blue-50' },
}

function Header({ onOpenSettings, onOpenPrompt }: { onOpenSettings: () => void; onOpenPrompt: () => void }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
          <Radio className="w-5 h-5 text-[hsl(5,85%,60%)]" />
        </div>
        <span className="font-bold text-white text-lg tracking-tight">AUDIO DOJO</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPrompt}
          className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          title="System Prompt"
        >
          <Brain className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>
    </header>
  )
}

function ModelSelect({
  label,
  value,
  options,
  onChange,
  disabled
}: {
  label: string
  value: string
  options: Array<{ id: string; name: string; desc: string }>
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(5,85%,60%)] focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.name} — {opt.desc}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

function SettingsPanel({
  config,
  onUpdate,
  onClose,
  isConnected
}: {
  config: VoiceAgentConfig
  onUpdate: (updates: Partial<VoiceAgentConfig>) => void
  onClose: () => void
  isConnected: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Stop the conversation to change settings
            </div>
          )}

          <ModelSelect
            label="Speech-to-Text"
            value={config.sttModel}
            options={STT_MODELS}
            onChange={(v) => onUpdate({ sttModel: v })}
            disabled={isConnected}
          />

          <ModelSelect
            label="Language Model"
            value={config.llmModel}
            options={LLM_MODELS}
            onChange={(v) => onUpdate({ llmModel: v })}
            disabled={isConnected}
          />

          <ModelSelect
            label="Text-to-Speech Voice"
            value={config.ttsModel}
            options={TTS_MODELS}
            onChange={(v) => onUpdate({ ttsModel: v })}
            disabled={isConnected}
          />
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-[hsl(5,85%,60%)] hover:bg-[hsl(5,85%,55%)] text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function SystemPromptPanel({
  config,
  onUpdate,
  onClose,
  isConnected
}: {
  config: VoiceAgentConfig
  onUpdate: (updates: Partial<VoiceAgentConfig>) => void
  onClose: () => void
  isConnected: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[hsl(5,85%,95%)] rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-[hsl(5,85%,60%)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">System Prompt</h2>
              <p className="text-xs text-slate-500">Define agent behavior and conversation script</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {isConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Stop the conversation to edit prompts
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            {/* Behavior Guide */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[hsl(5,85%,60%)]" />
                <label className="text-sm font-semibold text-slate-700">
                  Behavior Guide
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Personality, rules, constraints
              </p>
              <textarea
                value={config.behaviorGuide}
                onChange={(e) => onUpdate({ behaviorGuide: e.target.value })}
                disabled={isConnected}
                rows={14}
                className={cn(
                  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none font-mono leading-relaxed",
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(5,85%,60%)] focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                placeholder="Define how the agent should behave..."
              />
            </div>

            {/* Script Guide */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-[hsl(5,85%,60%)]" />
                <label className="text-sm font-semibold text-slate-700">
                  Script Guide
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Conversation flow, questions
              </p>
              <textarea
                value={config.scriptGuide}
                onChange={(e) => onUpdate({ scriptGuide: e.target.value })}
                disabled={isConnected}
                rows={14}
                className={cn(
                  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none font-mono leading-relaxed",
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(5,85%,60%)] focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                placeholder="Define the conversation script..."
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-[hsl(5,85%,60%)] hover:bg-[hsl(5,85%,55%)] text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function HeroSection({ status, config, onStart, onStop, isConnected, getAudioData }: {
  status: ConnectionStatus
  config: VoiceAgentConfig
  onStart: () => void
  onStop: () => void
  isConnected: boolean
  getAudioData: () => { inputData: Uint8Array; outputData: Uint8Array }
}) {
  const statusCfg = statusConfig[status]
  const sttName = STT_MODELS.find(m => m.id === config.sttModel)?.name || config.sttModel
  const llmName = LLM_MODELS.find(m => m.id === config.llmModel)?.name || config.llmModel
  const ttsName = TTS_MODELS.find(m => m.id === config.ttsModel)?.name || config.ttsModel

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl mb-4">
      <div className="flex items-center gap-8">
        {/* Left side - Status Visualization */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="relative mb-3">
            {isConnected && (
              <>
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-20",
                  status === 'speaking' ? 'bg-blue-400' : 'bg-emerald-400'
                )} />
                <div className={cn(
                  "absolute inset-4 rounded-full animate-pulse opacity-30",
                  status === 'speaking' ? 'bg-blue-400' : 'bg-emerald-400'
                )} />
              </>
            )}

            <div className={cn(
              "relative w-24 h-24 rounded-full flex items-center justify-center transition-colors",
              statusCfg.bgColor
            )}>
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                statusCfg.color
              )}>
                {status === 'speaking' ? (
                  <Volume2 className="w-6 h-6 text-white animate-pulse" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Status text - not a button */}
          <span className={cn(
            "text-xs font-medium",
            status === 'disconnected' && 'text-slate-400',
            status === 'connecting' && 'text-amber-500',
            status === 'connected' && 'text-emerald-500',
            status === 'speaking' && 'text-blue-500'
          )}>
            {statusCfg.label}
          </span>
        </div>

        {/* Center - Sound Wave Visualization */}
        <div className="flex-1 flex items-center justify-center">
          <SoundWave isActive={isConnected} getAudioData={getAudioData} />
        </div>

        {/* Right side - Info & Controls */}
        <div className="flex-1 text-right">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            Voice Assistant
          </h2>

          {/* Model pipeline */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs text-slate-500 mb-4">
            <span className="font-medium">{sttName}</span>
            <span className="text-slate-300">→</span>
            <span className="font-medium">{llmName}</span>
            <span className="text-slate-300">→</span>
            <span className="font-medium">{ttsName}</span>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 bg-[hsl(45,100%,50%)] hover:bg-[hsl(45,100%,45%)] text-slate-800 font-semibold px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all text-sm"
            >
              <Mic className="w-4 h-4" />
              START CONVERSATION
            </button>
          ) : (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all text-sm"
            >
              <MicOff className="w-4 h-4" />
              STOP
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function getEventStyle(entry: LogEntry) {
  const msg = entry.message.toLowerCase()

  if (entry.type === 'error') {
    return { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' }
  }
  if (msg.includes('granted') || msg.includes('connected') || msg.includes('ready') || msg.includes('sent') || msg.includes('started')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' }
  }
  if (msg.includes('connecting') || msg.includes('requesting')) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' }
  }
  if (msg.includes('stopped') || msg.includes('disconnected')) {
    return { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'text-slate-400' }
  }
  return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' }
}

function EventsPanel({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const logRef = useRef<HTMLDivElement>(null)
  const systemLogs = logs.filter(log => log.type === 'system' || log.type === 'error')

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [systemLogs])

  return (
    <div className="bg-white rounded-3xl p-5 shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[hsl(5,85%,60%)]" />
          <h2 className="font-bold text-slate-800 text-sm">EVENTS</h2>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <Trash2 className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
        </button>
      </div>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin min-h-0"
      >
        {systemLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p className="text-xs text-center">System events<br />will appear here</p>
          </div>
        ) : (
          systemLogs.map(entry => {
            const style = getEventStyle(entry)
            return (
              <div
                key={entry.id}
                className={cn("px-2.5 py-1.5 rounded-xl text-xs", style.bg)}
              >
                <div className="flex items-center gap-2">
                  {entry.type === 'error' ? (
                    <AlertTriangle className={cn("w-3 h-3 flex-shrink-0", style.icon)} />
                  ) : (
                    <Wifi className={cn("w-3 h-3 flex-shrink-0", style.icon)} />
                  )}
                  <p className={cn("break-words flex-1", style.text)}>
                    {entry.message}
                  </p>
                  <span className="text-[9px] text-slate-400 flex-shrink-0">
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function TranscriptPanel({ logs }: { logs: LogEntry[] }) {
  const logRef = useRef<HTMLDivElement>(null)
  const conversationLogs = logs.filter(log => log.type === 'user' || log.type === 'assistant')

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [conversationLogs])

  return (
    <div className="bg-white rounded-3xl p-5 shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-[hsl(5,85%,60%)]" />
        <h2 className="font-bold text-slate-800 text-sm">TRANSCRIPT</h2>
      </div>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin min-h-0"
      >
        {conversationLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p className="text-xs text-center">Conversation transcript<br />will appear here</p>
          </div>
        ) : (
          conversationLogs.map(entry => (
            <div
              key={entry.id}
              className={cn(
                "px-2.5 py-1.5 rounded-xl",
                entry.type === 'user'
                  ? 'bg-[hsl(5,85%,60%)] ml-6'
                  : 'bg-[hsl(5,85%,97%)] mr-6'
              )}
            >
              <div className="flex items-center gap-2">
                {entry.type === 'user' ? (
                  <User className="w-3 h-3 text-white/70 flex-shrink-0" />
                ) : (
                  <Bot className="w-3 h-3 text-[hsl(5,85%,60%)] flex-shrink-0" />
                )}
                <p className={cn(
                  "break-words text-xs flex-1",
                  entry.type === 'user' ? 'text-white' : 'text-slate-700'
                )}>
                  {entry.message.replace(/^(You: |Assistant: )/, '')}
                </p>
                <span className={cn(
                  "text-[9px] flex-shrink-0",
                  entry.type === 'user' ? 'text-white/50' : 'text-slate-400'
                )}>
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { status, logs, config, start, stop, clearLogs, updateConfig, getAudioData, isConnected } = useVoiceAgent()
  const [showSettings, setShowSettings] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  return (
    <div className="h-screen bg-[hsl(5,85%,60%)] p-4 md:p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <Header
          onOpenSettings={() => setShowSettings(true)}
          onOpenPrompt={() => setShowPrompt(true)}
        />

        <HeroSection
          status={status}
          config={config}
          onStart={start}
          onStop={stop}
          isConnected={isConnected}
          getAudioData={getAudioData}
        />

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <EventsPanel logs={logs} onClear={clearLogs} />
          <TranscriptPanel logs={logs} />
        </div>

        <footer className="py-3 text-center text-white/50 text-xs flex-shrink-0">
          Voice AI Experimentation Playground
        </footer>
      </div>

      {showSettings && (
        <SettingsPanel
          config={config}
          onUpdate={updateConfig}
          onClose={() => setShowSettings(false)}
          isConnected={isConnected}
        />
      )}

      {showPrompt && (
        <SystemPromptPanel
          config={config}
          onUpdate={updateConfig}
          onClose={() => setShowPrompt(false)}
          isConnected={isConnected}
        />
      )}
    </div>
  )
}
