import React, { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  onClose: () => void
}

export function SearchBar({ onClose }: SearchBarProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [matchInfo, setMatchInfo] = useState({ active: 0, total: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Receive match count from main process
  useEffect(() => {
    const handler = (_: unknown, result: { activeMatchOrdinal: number; matches: number }) => {
      setMatchInfo({ active: result.activeMatchOrdinal, total: result.matches })
    }
    const removeIpcListener = window.electron.ipcRenderer.on('found-in-page', handler)
    return () => {
      // IPC リスナーの削除（存在する場合のみ）
      removeIpcListener?.()
    }
  }, [])

  // Search on text change
  useEffect(() => {
    if (searchText.trim()) {
      window.searchApi.searchInPage(searchText, { forward: true, findNext: false })
    } else {
      window.searchApi.stopSearch()
      setMatchInfo({ active: 0, total: 0 })
    }
  }, [searchText])

  const handleNext = () => {
    if (searchText.trim())
      window.searchApi.searchInPage(searchText, { forward: true, findNext: true })
  }

  const handlePrev = () => {
    if (searchText.trim())
      window.searchApi.searchInPage(searchText, { forward: false, findNext: true })
  }

  const handleClose = () => {
    window.searchApi.stopSearch()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      e.shiftKey ? handlePrev() : handleNext()
    }
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <div className="border-t border-gray-200 px-2 py-2 bg-white">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page..."
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 min-w-0"
        />
        <span className="text-xs text-gray-400 shrink-0 w-10 text-center">
          {searchText && matchInfo.total > 0 ? `${matchInfo.active}/${matchInfo.total}` : ''}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-1">
          <button
            onClick={handlePrev}
            disabled={matchInfo.total === 0}
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            title="Previous (Shift+Enter)"
          >
            <span className="codicon codicon-chevron-up text-xs" />
          </button>
          <button
            onClick={handleNext}
            disabled={matchInfo.total === 0}
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            title="Next (Enter)"
          >
            <span className="codicon codicon-chevron-down text-xs" />
          </button>
        </div>
        <button
          onClick={handleClose}
          className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
          title="Close (Esc)"
        >
          <span className="codicon codicon-close text-xs" />
        </button>
      </div>
    </div>
  )
}
