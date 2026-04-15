import { useState, useCallback } from 'react'

export type TranscriptState =
  | { status: 'idle' }
  | { status: 'loading'; progress: string }
  | { status: 'done'; text: string }
  | { status: 'error'; message: string }

interface UseTranscriptReturn {
  state: TranscriptState
  transcribe: (videoId: string) => void
  reset: () => void
}

export function useTranscript(): UseTranscriptReturn {
  const [state, setState] = useState<TranscriptState>({ status: 'idle' })

  const transcribe = useCallback(async (videoId: string) => {
    setState({ status: 'loading', progress: 'Fetching transcript…' })
    try {
      const res = await fetch(`/api/transcript?v=${encodeURIComponent(videoId)}`)
      const data = await res.json() as { transcript?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
      setState({ status: 'done', text: data.transcript ?? '' })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch transcript',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, transcribe, reset }
}
