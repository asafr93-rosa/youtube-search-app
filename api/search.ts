import type { VercelRequest, VercelResponse } from '@vercel/node'
import yts from 'yt-search'

export const config = {
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = req.query.q

  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Missing query' })
  }

  try {
    const result = await yts(q.trim())
    const videos = result.videos.slice(0, 20).map((v) => ({
      videoId: v.videoId,
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail ?? '',
      author: v.author.name,
      duration: v.timestamp,
    }))
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json({ videos })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Search failed' })
  }
}
