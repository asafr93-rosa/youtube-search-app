import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = req.query.v

  if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
    return res.status(400).json({ error: 'Missing or invalid video id' })
  }

  const whisperUrl = process.env.WHISPER_SERVER_URL
  if (!whisperUrl) {
    return res.status(503).json({ error: 'WHISPER_SERVER_URL not configured' })
  }

  try {
    const upstream = await fetch(
      `${whisperUrl.replace(/\/$/, '')}/transcribe?v=${encodeURIComponent(videoId)}`,
      { signal: AbortSignal.timeout(55_000) }
    )

    const data = await upstream.json() as { transcript?: string; error?: string }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error ?? 'Whisper server error' })
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json({ transcript: data.transcript })
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Could not reach Whisper server',
    })
  }
}
