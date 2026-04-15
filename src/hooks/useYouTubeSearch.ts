import { useState, useEffect, useRef } from 'react'

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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error(`Search failed: ${res.status}`)
        const data = await res.json() as { videos: VideoResult[] }
        setVideos(data.videos)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
        setVideos([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [query])

  return { videos, loading, error }
}
