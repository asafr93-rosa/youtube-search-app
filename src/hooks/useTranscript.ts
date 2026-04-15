import { useState, useRef, useCallback } from 'react'

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
  const workerRef = useRef<Worker | null>(null)

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/whisper.worker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return workerRef.current
  }

  const transcribe = useCallback(async (videoId: string) => {
    setState({ status: 'loading', progress: 'Fetching audio…' })

    let audioBuffer: ArrayBuffer
    try {
      const response = await fetch(`/api/audio?v=${encodeURIComponent(videoId)}`)
      if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`)
      audioBuffer = await response.arrayBuffer()
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch audio',
      })
      return
    }

    const worker = getWorker()

    // Remove previous listener before adding new one
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setState({ status: 'loading', progress: msg.text })
      } else if (msg.type === 'done') {
        setState({ status: 'done', text: msg.transcript })
      } else if (msg.type === 'error') {
        setState({ status: 'error', message: msg.message })
      }
    }

    worker.onerror = (e) => {
      setState({ status: 'error', message: e.message ?? 'Worker error' })
    }

    worker.postMessage({ type: 'transcribe', audioBuffer }, [audioBuffer])
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  return { state, transcribe, reset }
}
