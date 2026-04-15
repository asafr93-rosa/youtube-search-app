import { useEffect, useRef } from 'react'
import type { TranscriptState } from '../hooks/useTranscript'

interface TranscriptPanelProps {
  videoTitle: string
  state: TranscriptState
  onClose: () => void
}

export function TranscriptPanel({ videoTitle, state, onClose }: TranscriptPanelProps) {
  const textRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as transcript streams in
  useEffect(() => {
    if (state.status === 'done' && textRef.current) {
      textRef.current.scrollTop = 0
    }
  }, [state])

  async function handleCopy() {
    if (state.status !== 'done') return
    await navigator.clipboard.writeText(state.text)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#1A1A1A] border-l border-[#272727] flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-4 border-b border-[#272727]">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#aaa] uppercase tracking-wide mb-1">Transcript</p>
          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{videoTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-white hover:bg-[#272727] transition-colors"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.854 3.146a.5.5 0 0 1 0 .708L8.707 8l4.147 4.146a.5.5 0 0 1-.708.708L8 8.707l-4.146 4.147a.5.5 0 0 1-.708-.708L7.293 8 3.146 3.854a.5.5 0 0 1 .708-.708L8 7.293l4.146-4.147a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {state.status === 'idle' && (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-[#666] text-sm text-center">Transcript will appear here.</p>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#272727]" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF0000] animate-spin" />
            </div>
            <p className="text-[#aaa] text-sm text-center leading-relaxed">{state.progress}</p>
            <p className="text-[#555] text-xs text-center">First run downloads ~150MB model, then it's cached.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#ef4444">
                <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zM9 7a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V7zm1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-red-400 text-sm text-center">{state.message}</p>
          </div>
        )}

        {state.status === 'done' && (
          <div ref={textRef} className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-[#e0e0e0] text-sm leading-7 whitespace-pre-wrap">{state.text}</p>
          </div>
        )}
      </div>

      {/* Footer — copy button */}
      {state.status === 'done' && (
        <div className="px-4 py-3 border-t border-[#272727]">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-lg bg-[#272727] hover:bg-[#333] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6z"/>
              <path d="M2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z"/>
            </svg>
            Copy transcript
          </button>
        </div>
      )}
    </div>
  )
}
