import type { VercelRequest, VercelResponse } from '@vercel/node'
import ytdl from 'ytdl-core'

export const config = {
  maxDuration: 60,
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = req.query.v

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing video id' })
  }

  if (!ytdl.validateID(videoId)) {
    return res.status(400).json({ error: 'Invalid video id' })
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  res.setHeader('Content-Type', 'audio/webm')
  res.setHeader('Access-Control-Allow-Origin', '*')

  ytdl(videoUrl, { filter: 'audioonly', quality: 'lowestaudio' })
    .on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message })
      } else {
        res.end()
      }
    })
    .pipe(res)
}
