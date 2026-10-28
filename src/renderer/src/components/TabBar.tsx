import type React from 'react'
import { TAB_BAR_HEIGHT } from '../../../shared/layout'
import type { TabsState } from '../../../shared/types'

interface TabBarProps {
  state: TabsState | null
  // Width of the sidebar (the tab bar sits to the right of it)
  left: number
}

export function TabBar({ state, left }: TabBarProps): React.ReactElement {
  return (
    <div
      className="fixed top-0 right-0 flex items-end gap-0.5 px-2 pt-1 bg-gray-100 border-b border-gray-200 transition-all duration-200"
      style={{ left, height: TAB_BAR_HEIGHT }}
    >
      {state?.tabs.map((tab) => {
        const active = tab.id === state.activeTabId
        return (
          <div
            key={tab.id}
            className={`flex items-center min-w-0 flex-1 max-w-[220px] h-full pr-1 rounded-t-md ${
              active ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <button
              type="button"
              title={tab.url}
              onClick={() => window.tabsApi.activate(tab.id)}
              className="flex items-center gap-1.5 min-w-0 flex-1 h-full pl-3 text-left"
            >
              {tab.crashed && (
                <span className="codicon codicon-error text-xs text-red-500 shrink-0" />
              )}
              {tab.loading && !tab.crashed && (
                <span className="codicon codicon-loading codicon-modifier-spin text-xs shrink-0" />
              )}
              {!tab.loading && !tab.crashed && tab.favicon && (
                <img src={tab.favicon} alt="" className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate text-xs">{tab.title || tab.url || 'New Tab'}</span>
            </button>
            <button
              type="button"
              title="Close tab"
              onClick={() => window.tabsApi.close(tab.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-gray-200"
            >
              <span className="codicon codicon-close text-xs" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        title="New tab"
        onClick={() => window.tabsApi.create()}
        className="shrink-0 self-center ml-1 rounded p-1 hover:bg-gray-200 transition-colors"
      >
        <span className="codicon codicon-add text-sm text-gray-600" />
      </button>
    </div>
  )
}
