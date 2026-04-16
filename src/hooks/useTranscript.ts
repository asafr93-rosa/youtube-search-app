import { useState, useCallback } from 'react'

export type TranscriptState =
  | { status: 'idle' }
  | { status: 'loading'; progress: string }
  | { status: 'done'; text: string; source: 'whisper' | 'captions' }
  | { status: 'error'; message: string }

interface UseTranscriptReturn {
  state: TranscriptState
  transcribe: (videoId: string) => void
  reset: () => void
}

async function fetchJson(url: string): Promise<{ transcript?: string; error?: string }> {
  const res = await fetch(url)
  const data = await res.json() as { transcript?: string; error?: string }
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data
}

export function useTranscript(): UseTranscriptReturn {
  const [state, setState] = useState<TranscriptState>({ status: 'idle' })

  const transcribe = useCallback(async (videoId: string) => {
    setState({ status: 'loading', progress: 'Connecting to Whisper…' })

    // 1. Try Whisper server — always fall back to captions on any failure
    try {
      const data = await fetchJson(`/api/whisper?v=${encodeURIComponent(videoId)}`)
      setState({ status: 'done', text: data.transcript ?? '', source: 'whisper' })
      return
    } catch {
      // Whisper unavailable or failed — fall through to captions silently
    }

    // 2. Fall back to YouTube auto-captions
    setState({ status: 'loading', progress: 'Fetching YouTube captions…' })
    try {
      const data = await fetchJson(`/api/transcript?v=${encodeURIComponent(videoId)}`)
      setState({ status: 'done', text: data.transcript ?? '', source: 'captions' })
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
