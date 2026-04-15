import type { Plugin } from 'vite'
import yts from 'yt-search'
import type { IncomingMessage, ServerResponse } from 'http'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)'

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}

async function getTranscript(videoId: string): Promise<string> {
  const playerResp = await fetch(
    'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
        videoId,
      }),
    }
  )

  if (!playerResp.ok) throw new Error(`YouTube API error: ${playerResp.status}`)

  const playerData = await playerResp.json() as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{ baseUrl: string; languageCode: string }>
      }
    }
  }

  const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('No captions available for this video')
  }

  const track =
    tracks.find((t) => t.languageCode === 'en') ||
    tracks.find((t) => t.languageCode.startsWith('en')) ||
    tracks[0]

  const xmlResp = await fetch(track.baseUrl, { headers: { 'User-Agent': USER_AGENT } })
  const xml = await xmlResp.text()

  const segments: string[] = []
  const regex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const text = decodeEntities(match[3].replace(/<[^>]+>/g, '')).trim()
    if (text && text !== '[Music]' && text !== '[Applause]') segments.push(text)
  }

  if (segments.length === 0) throw new Error('Could not parse captions for this video')
  return segments.join(' ')
}

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
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ videos }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Search failed' }))
        }
      })

      // /api/transcript?v=videoId
      server.middlewares.use('/api/transcript', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const videoId = url.searchParams.get('v')
        if (!videoId || videoId.length !== 11) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing or invalid video id' }))
          return
        }
        try {
          const transcript = await getTranscript(videoId)
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ transcript }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to fetch transcript' }))
        }
      })
    },
  }
}
