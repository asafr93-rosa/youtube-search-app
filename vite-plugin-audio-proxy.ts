import type { Plugin } from 'vite'
import ytdl from 'ytdl-core'
import yts from 'yt-search'
import type { IncomingMessage, ServerResponse } from 'http'

export function audioProxyPlugin(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      // /api/search?q=query
      server.middlewares.use('/api/search', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const q = url.searchParams.get('q')

        if (!q?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing query' }))
          return
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
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ videos }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Search failed' }))
        }
      })

      // /api/audio?v=videoId
      server.middlewares.use('/api/audio', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const videoId = url.searchParams.get('v')

        if (!videoId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing video id' }))
          return
        }

        if (!ytdl.validateID(videoId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid video id' }))
          return
        }

        try {
          res.writeHead(200, {
            'Content-Type': 'audio/webm',
            'Access-Control-Allow-Origin': '*',
          })
          ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            filter: 'audioonly',
            quality: 'lowestaudio',
          }).pipe(res)
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch audio' }))
          }
        }
      })
    },
  }
}
