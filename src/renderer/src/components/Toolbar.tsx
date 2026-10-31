import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { TOOLBAR_HEIGHT } from '../../../shared/layout'
import type { NavigationState } from '../../../shared/types'

// How much the page can be trusted, shown in front of the address
export type PageSecurity = 'secure' | 'insecure' | 'bypassed' | 'error' | 'none'

const SECURITY_ICONS: Record<
  Exclude<PageSecurity, 'none'>,
  { icon: string; title: string; className: string }
> = {
  secure: {
    icon: 'codicon-lock',
    title: 'Connection is secure',
    className: 'text-muted-foreground',
  },
  insecure: { icon: 'codicon-unlock', title: 'Not secure', className: 'text-amber-600' },
  bypassed: {
    icon: 'codicon-warning',
    title: 'Certificate error: loaded because you chose to proceed',
    className: 'text-red-500',
  },
  error: { icon: 'codicon-warning', title: 'Certificate error', className: 'text-red-500' },
}

interface ToolbarProps {
  state: NavigationState | null
  security: PageSecurity
  // The lock was clicked: show the certificate of the page
  onSecurityClick: () => void
  // Width of the sidebar (the toolbar sits to the right of it)
  left: number
  // Distance from the top of the window (below the tab bar, when it is shown)
  top: number
  // Ctrl/Cmd+L was pressed: take the focus once the address bar is on screen
  focusRequested: boolean
  onFocusHandled: () => void
  // The tab bar is hidden, so the new tab button lives here
  showNewTab: boolean
  onReload: () => void
}

export function Toolbar({
  state,
  security,
  onSecurityClick,
  left,
  top,
  focusRequested,
  onFocusHandled,
  showNewTab,
  onReload,
}: ToolbarProps): React.ReactElement {
  const url = state?.url ?? ''
  const [draft, setDraft] = useState(url)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl/Cmd+L (handled by the main process) focuses the address bar. In minimal mode the bar is
  // drawn only now, so the request waits here until the input exists.
  useEffect(() => {
    if (!focusRequested || !inputRef.current) return
    inputRef.current.focus()
    inputRef.current.select()
    onFocusHandled()
  }, [focusRequested, onFocusHandled])

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
      className="fixed right-0 flex items-center gap-1 px-2 bg-background border-b border-border transition-all duration-200"
      style={{ left, top, height: TOOLBAR_HEIGHT }}
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
      {security !== 'none' && (
        <button
          type="button"
          title={`${SECURITY_ICONS[security].title} (click for details)`}
          onClick={onSecurityClick}
          className="-mr-8 z-10 ml-1 w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent"
        >
          <span
            className={`codicon ${SECURITY_ICONS[security].icon} text-sm leading-none ${SECURITY_ICONS[security].className}`}
          />
        </button>
      )}
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
        onBlur={() => {
          setEditing(false)
          // In minimal mode the address bar goes away when it is left
          window.navigationApi.releaseToolbar()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submit()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            setDraft(url)
            e.currentTarget.blur()
          }
        }}
        className={`flex-1 min-w-0 h-7 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground bg-muted rounded-full outline-hidden focus:bg-background focus:ring-2 focus:ring-blue-400 ${
          security === 'none' ? 'pl-3' : 'pl-9'
        }`}
        placeholder="Search or enter address"
      />
      {showNewTab && (
        <ToolbarButton icon="codicon-add" title="New tab" onClick={() => window.tabsApi.create()} />
      )}
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
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-sm hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <span className={`codicon ${icon} text-lg leading-none text-foreground/80`} />
    </button>
  )
}
