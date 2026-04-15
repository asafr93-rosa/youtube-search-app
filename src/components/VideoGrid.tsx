import type { VideoResult } from '../hooks/useYouTubeSearch'

interface VideoGridProps {
  videos: VideoResult[]
  loading: boolean
  error: string | null
  onTranscript: (video: VideoResult) => void
}

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A1A] rounded-xl overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-[#272727]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[#272727] rounded w-4/5" />
        <div className="h-3 bg-[#272727] rounded w-1/2" />
        <div className="h-8 bg-[#272727] rounded mt-3" />
      </div>
    </div>
  )
}

export function VideoGrid({ videos, loading, error, onTranscript }: VideoGridProps) {
  if (error) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="#ef4444">
            <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zM9 7a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V7zm1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd"/>
          </svg>
        </div>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
      {videos.map((video) => (
        <div key={video.videoId} className="bg-[#1A1A1A] rounded-xl overflow-hidden group flex flex-col hover:bg-[#222] transition-colors">
          {/* Thumbnail */}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full aspect-video bg-[#272727] shrink-0"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="white">
                  <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
                </svg>
              </div>
            </div>
            {/* Duration badge */}
            {video.duration && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                {video.duration}
              </span>
            )}
          </a>

          {/* Info */}
          <div className="p-3 flex flex-col flex-1">
            <p className="text-white text-sm font-medium line-clamp-2 leading-snug mb-1">
              {video.title}
            </p>
            <p className="text-[#aaa] text-xs truncate mb-3">{video.author}</p>

            {/* Transcript button — always visible */}
            <button
              onClick={() => onTranscript(video)}
              className="mt-auto w-full py-2 rounded-lg bg-[#FF0000] hover:bg-[#cc0000] active:bg-[#aa0000] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm2 .5v2a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5zm0 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5zm0 2a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0-.5.5zm0 2a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0-.5.5z"/>
              </svg>
              Transcript
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
