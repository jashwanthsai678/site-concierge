import { AnimatedCharacter, type VoiceOrbState } from '@/components/voice/AnimatedCharacter'
import type { MascotEnergy } from '@/lib/mascotRegistry'
import { SpeechBubble } from '@/components/voice/SpeechBubble'
import { MicButton } from '@/components/voice/MicButton'
import { TextInputBar } from '@/components/voice/TextInputBar'
import { StageProgress } from '@/components/widget/StageProgress'
import { HistoryDrawer } from '@/components/widget/HistoryDrawer'
import type { CommunicationMode } from '@/components/widget/WidgetPromptCard'
import type { TranscriptEntry } from '@/types/conversation'

/**
 * The expanded widget view: a full-body mascot standing directly on the
 * page (no chat-window chrome) with his current line shown in a comic-style
 * speech bubble above his head. Conversation history is deliberately NOT
 * shown by default — it's still fully retained in `transcript` (see
 * VoiceWidget), just tucked behind the small clock-icon button until the
 * visitor asks to see it, via HistoryDrawer.
 */
export function MascotStage({
  businessName,
  mascotKey,
  customImageUrl,
  assetBase,
  apiBase,
  connecting,
  orbState,
  transcript,
  isListening,
  sttSupported,
  micDisabled,
  onMicClick,
  onTextSubmit,
  textInputAutoFocus,
  mode,
  onModeToggle,
  onClose,
  endMessage,
  stageStep,
  suggestion,
  showHistory,
  onToggleHistory,
  stageTier,
  energy,
}: {
  businessName: string
  mascotKey: string
  customImageUrl?: string | null
  assetBase?: string
  apiBase?: string
  connecting: boolean
  orbState: VoiceOrbState
  transcript: TranscriptEntry[]
  isListening: boolean
  sttSupported: boolean
  micDisabled: boolean
  onMicClick: () => void
  onTextSubmit: (text: string) => void
  textInputAutoFocus: boolean
  mode: CommunicationMode
  onModeToggle: () => void
  onClose: () => void
  endMessage: string | null
  stageStep: number
  suggestion: { label: string; onClick: () => void } | null
  showHistory: boolean
  onToggleHistory: () => void
  stageTier: number
  energy?: MascotEnergy
}) {
  if (showHistory) {
    return <HistoryDrawer businessName={businessName} entries={transcript} onClose={onToggleHistory} />
  }

  const currentEntry = transcript[transcript.length - 1]

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6">
      {!connecting && !endMessage && <StageProgress step={stageStep} />}

      <div className="flex items-center gap-1.5">
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-md backdrop-blur">
          {businessName}
        </div>
        {sttSupported && !connecting && !endMessage && (
          <button
            type="button"
            onClick={onModeToggle}
            aria-label={mode === 'voice' ? 'Switch to typing' : 'Switch to voice'}
            title={mode === 'voice' ? 'Switch to typing' : 'Switch to voice'}
            className="rounded-full bg-white/90 px-2.5 py-1 text-xs shadow-md backdrop-blur transition-colors hover:bg-gray-50"
          >
            {mode === 'voice' ? '🎙️' : '⌨️'}
          </button>
        )}
      </div>

      {connecting ? (
        <SpeechBubble typing />
      ) : endMessage ? (
        <SpeechBubble text={endMessage} />
      ) : orbState === 'thinking' ? (
        <SpeechBubble typing />
      ) : currentEntry ? (
        <SpeechBubble text={currentEntry.text} muted={currentEntry.role === 'visitor'} />
      ) : null}

      {suggestion && !connecting && !endMessage && (
        <button
          type="button"
          onClick={suggestion.onClick}
          className="max-w-[240px] rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-left text-xs text-gray-600 shadow-md backdrop-blur transition-colors hover:bg-gray-50"
        >
          💡 {suggestion.label}
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-1 -right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-800/80 text-sm text-white shadow hover:bg-gray-900"
        >
          ×
        </button>
        {!endMessage && transcript.length > 0 && (
          <button
            type="button"
            onClick={onToggleHistory}
            aria-label="View conversation history"
            className="absolute -top-1 -left-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow hover:bg-gray-50"
          >
            🕘
          </button>
        )}
        <AnimatedCharacter
          state={orbState}
          mascotKey={mascotKey}
          customImageUrl={customImageUrl}
          assetBase={assetBase}
          apiBase={apiBase}
          stageTier={stageTier}
          energy={energy}
        />
      </div>

      {!connecting && !endMessage && (
        <MicButton isListening={isListening} isSupported={sttSupported} disabled={micDisabled} onClick={onMicClick} />
      )}

      {!connecting && !endMessage && (
        <TextInputBar disabled={micDisabled} autoFocus={textInputAutoFocus} onSubmit={onTextSubmit} />
      )}
    </div>
  )
}
