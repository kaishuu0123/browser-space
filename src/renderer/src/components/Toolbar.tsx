import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { TAB_BAR_HEIGHT, TOOLBAR_HEIGHT } from '../../../shared/layout'
import type { NavigationState } from '../../../shared/types'

interface ToolbarProps {
  state: NavigationState | null
  // Width of the sidebar (the toolbar sits to the right of it)
  left: number
  onReload: () => void
}

export function Toolbar({ state, left, onReload }: ToolbarProps): React.ReactElement {
  const url = state?.url ?? ''
  const [draft, setDraft] = useState(url)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl/Cmd+L (handled by the main process) focuses the address bar
  useEffect(() => {
    return window.navigationApi.onFocusUrl(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  // Follow the page URL unless the user is typing
  useEffect(() => {
    if (!editing) setDraft(url)
  }, [url, editing])

  const submit = () => {
    window.navigationApi.navigate(draft)
    setEditing(false)
  }

  return (
    <div
      className="fixed right-0 flex items-center gap-1 px-2 bg-white border-b border-gray-200 transition-all duration-200"
      style={{ left, top: TAB_BAR_HEIGHT, height: TOOLBAR_HEIGHT }}
    >
      <ToolbarButton
        icon="codicon-arrow-left"
        title="Back"
        disabled={!state?.canGoBack}
        onClick={() => window.navigationApi.goBack()}
      />
      <ToolbarButton
        icon="codicon-arrow-right"
        title="Forward"
        disabled={!state?.canGoForward}
        onClick={() => window.navigationApi.goForward()}
      />
      <ToolbarButton icon="codicon-refresh" title="Reload" onClick={onReload} />
      <input
        ref={inputRef}
        type="text"
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setEditing(true)
          e.currentTarget.select()
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submit()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            setDraft(url)
            e.currentTarget.blur()
          }
        }}
        className="flex-1 min-w-0 h-7 px-3 text-sm text-gray-700 bg-gray-100 rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-400"
        placeholder="Search or enter address"
      />
    </div>
  )
}

interface ToolbarButtonProps {
  icon: string
  title: string
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({
  icon,
  title,
  disabled = false,
  onClick,
}: ToolbarButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <span className={`codicon ${icon} text-lg text-gray-600`} />
    </button>
  )
}
