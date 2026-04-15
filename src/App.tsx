import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { VideoGrid } from './components/VideoGrid'
import { TranscriptPanel } from './components/TranscriptPanel'
import { useYouTubeSearch } from './hooks/useYouTubeSearch'
import { useTranscript } from './hooks/useTranscript'
import type { VideoResult } from './hooks/useYouTubeSearch'

function App() {
  const [query, setQuery] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null)
  const { videos, loading, error } = useYouTubeSearch(query)
  const { state: transcriptState, transcribe, reset } = useTranscript()

  function handleTranscript(video: VideoResult) {
    setSelectedVideo(video)
    transcribe(video.videoId)
  }

  function handleClosePanel() {
    setSelectedVideo(null)
    reset()
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F0F0F] border-b border-[#272727]">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="5" fill="#FF0000"/>
              <polygon points="9.5,7 18,12 9.5,17" fill="white"/>
            </svg>
            <span className="text-white font-semibold text-base tracking-tight hidden sm:block">
              YouTube Search
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center">
            <SearchBar onSearch={setQuery} loading={loading} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`max-w-screen-2xl mx-auto px-4 py-6 transition-all duration-300 ${
          selectedVideo ? 'sm:mr-96' : ''
        }`}
      >
        {/* Empty state */}
        {!loading && videos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center mt-24 gap-4 text-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="opacity-20">
              <rect width="24" height="24" rx="5" fill="#FF0000"/>
              <polygon points="9.5,7 18,12 9.5,17" fill="white"/>
            </svg>
            <p className="text-[#717171] text-base">Search for videos to get started</p>
          </div>
        )}

        <VideoGrid
          videos={videos}
          loading={loading}
          error={error}
          onTranscript={handleTranscript}
        />
      </main>

      {/* Transcript panel */}
      {selectedVideo && (
        <TranscriptPanel
          videoTitle={selectedVideo.title}
          state={transcriptState}
          onClose={handleClosePanel}
        />
      )}
    </div>
  )
}

export default App
