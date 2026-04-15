import { useState, useEffect, useRef } from 'react'
import yts from 'yt-search'

export interface VideoResult {
  videoId: string
  title: string
  url: string
  thumbnail: string
  author: string
  duration: string
}

interface UseYouTubeSearchReturn {
  videos: VideoResult[]
  loading: boolean
  error: string | null
}

export function useYouTubeSearch(query: string): UseYouTubeSearchReturn {
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setVideos([])
      setError(null)
      return
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await yts(query)
        setVideos(
          result.videos.slice(0, 20).map((v) => ({
            videoId: v.videoId,
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnail ?? '',
            author: v.author.name,
            duration: v.timestamp,
          }))
        )
      } catch {
        setError('Search failed. Please try again.')
        setVideos([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  return { videos, loading, error }
}
