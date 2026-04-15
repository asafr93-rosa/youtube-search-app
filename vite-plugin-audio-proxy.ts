import type { Plugin } from 'vite'
import ytdl from 'ytdl-core'
import type { IncomingMessage, ServerResponse } from 'http'

export function audioProxyPlugin(): Plugin {
  return {
    name: 'audio-proxy',
    configureServer(server) {
      server.middlewares.use('/api/audio', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const videoId = url.searchParams.get('v')

        if (!videoId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing video id' }))
          return
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

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
          ytdl(videoUrl, { filter: 'audioonly', quality: 'lowestaudio' }).pipe(res)
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
