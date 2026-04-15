import { useState, type KeyboardEvent } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim())
    }
  }

  function handleSearch() {
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <div className="flex w-full max-w-2xl">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search videos…"
        className="flex-1 px-5 py-3 rounded-l-full bg-[#121212] border border-[#303030] border-r-0 text-white placeholder-[#717171] text-sm outline-none focus:border-[#1c62b9] transition-colors"
      />
      <button
        onClick={handleSearch}
        disabled={loading || !value.trim()}
        className="px-6 py-3 rounded-r-full bg-[#222222] border border-[#303030] text-white hover:bg-[#3d3d3d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        aria-label="Search"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#555] border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
