import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 30,
}

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
  // Fetch caption tracks via YouTube Innertube API
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

  if (!playerResp.ok) {
    throw new Error(`YouTube API error: ${playerResp.status}`)
  }

  const playerData = await playerResp.json() as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{ baseUrl: string; languageCode: string; name: { simpleText: string } }>
      }
    }
  }

  const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('No captions available for this video')
  }

  // Prefer English, fall back to first available
  const track =
    tracks.find((t) => t.languageCode === 'en') ||
    tracks.find((t) => t.languageCode.startsWith('en')) ||
    tracks[0]

  const xmlResp = await fetch(track.baseUrl, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!xmlResp.ok) {
    throw new Error(`Failed to fetch caption track: ${xmlResp.status}`)
  }

  const xml = await xmlResp.text()

  // Parse <p t="ms" d="ms">text</p> format
  const segments: string[] = []
  const regex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(xml)) !== null) {
    const raw = match[3]
    // Strip inner <s> word-timing tags if present
    const text = decodeEntities(raw.replace(/<[^>]+>/g, '')).trim()
    if (text && text !== '[Music]' && text !== '[Applause]') {
      segments.push(text)
    }
  }

  if (segments.length === 0) {
    throw new Error('Could not parse captions for this video')
  }

  return segments.join(' ')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = req.query.v

  if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
    return res.status(400).json({ error: 'Missing or invalid video id' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const transcript = await getTranscript(videoId)
    return res.status(200).json({ transcript })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch transcript',
    })
  }
}
