import { pipeline, env } from '@xenova/transformers'

// Use remote models (cached by browser after first download)
env.allowLocalModels = false

type WorkerInMessage =
  | { type: 'transcribe'; audioBuffer: ArrayBuffer }

type WorkerOutMessage =
  | { type: 'progress'; text: string }
  | { type: 'done'; transcript: string }
  | { type: 'error'; message: string }

let transcriber: Awaited<ReturnType<typeof pipeline>> | null = null

async function getTranscriber() {
  if (transcriber) return transcriber

  self.postMessage({ type: 'progress', text: 'Loading Whisper model (first time ~150MB, then cached)…' } satisfies WorkerOutMessage)

  transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
      if (progress.status === 'downloading') {
        const pct = progress.progress ? Math.round(progress.progress) : 0
        self.postMessage({
          type: 'progress',
          text: `Downloading model: ${pct}%`,
        } satisfies WorkerOutMessage)
      } else if (progress.status === 'loading') {
        self.postMessage({ type: 'progress', text: 'Loading model into memory…' } satisfies WorkerOutMessage)
      }
    },
  })

  return transcriber
}

async function decodeAudio(buffer: ArrayBuffer): Promise<Float32Array> {
  // Use OfflineAudioContext to decode and resample to 16kHz mono
  const audioCtx = new OfflineAudioContext(1, 1, 16000)
  const decoded = await audioCtx.decodeAudioData(buffer.slice(0))
  const targetLength = Math.ceil(decoded.duration * 16000)
  const offlineCtx = new OfflineAudioContext(1, targetLength, 16000)
  const source = offlineCtx.createBufferSource()
  source.buffer = decoded
  source.connect(offlineCtx.destination)
  source.start(0)
  const rendered = await offlineCtx.startRendering()
  return rendered.getChannelData(0)
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type !== 'transcribe') return

  try {
    self.postMessage({ type: 'progress', text: 'Decoding audio…' } satisfies WorkerOutMessage)
    const audioData = await decodeAudio(e.data.audioBuffer)

    const pipe = await getTranscriber()

    self.postMessage({ type: 'progress', text: 'Transcribing… (this may take a minute)' } satisfies WorkerOutMessage)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (pipe as any)(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
    }) as { text: string }

    self.postMessage({ type: 'done', transcript: result.text.trim() } satisfies WorkerOutMessage)
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Transcription failed',
    } satisfies WorkerOutMessage)
  }
}
