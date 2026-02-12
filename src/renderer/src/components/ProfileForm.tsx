import React, { useState, useRef } from 'react'
import { Profile } from '../../../shared/types'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface ProfileFormProps {
  profile?: Profile
  onSubmit: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void
  onCancel: () => void
}

const PRESET_ICONS = [
  'account',
  'mail',
  'browser',
  'organization',
  'briefcase',
  'book',
  'calendar',
  'database'
]

// Comprehensive list of Codicons from @vscode/codicons
const ALL_ICONS = [
  'account',
  'activate-breakpoints',
  'add',
  'archive',
  'array',
  'arrow-both',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'arrow-small-down',
  'arrow-small-left',
  'arrow-small-right',
  'arrow-small-up',
  'arrow-up',
  'azure',
  'beaker',
  'bell',
  'bell-dot',
  'bell-slash',
  'blank',
  'bold',
  'book',
  'bookmark',
  'bracket',
  'briefcase',
  'broadcast',
  'browser',
  'bug',
  'calendar',
  'call-incoming',
  'call-outgoing',
  'case-sensitive',
  'check',
  'check-all',
  'checklist',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chrome-close',
  'chrome-maximize',
  'chrome-minimize',
  'chrome-restore',
  'circle',
  'circle-filled',
  'circle-large',
  'circle-large-filled',
  'circle-large-outline',
  'circle-outline',
  'circle-slash',
  'circuit-board',
  'clear-all',
  'clippy',
  'close',
  'close-all',
  'cloud',
  'cloud-download',
  'cloud-upload',
  'code',
  'collapse-all',
  'color-mode',
  'combine',
  'comment',
  'comment-discussion',
  'comment-draft',
  'comment-unresolved',
  'compare-changes',
  'compass',
  'compass-active',
  'compass-dot',
  'copy',
  'credit-card',
  'dash',
  'dashboard',
  'database',
  'debug',
  'debug-all',
  'debug-alt',
  'debug-alt-small',
  'debug-breakpoint',
  'debug-breakpoint-conditional',
  'debug-breakpoint-conditional-unverified',
  'debug-breakpoint-data',
  'debug-breakpoint-data-unverified',
  'debug-breakpoint-function',
  'debug-breakpoint-function-unverified',
  'debug-breakpoint-log',
  'debug-breakpoint-log-unverified',
  'debug-breakpoint-unsupported',
  'debug-console',
  'debug-continue',
  'debug-coverage',
  'debug-disconnect',
  'debug-line-by-line',
  'debug-pause',
  'debug-rerun',
  'debug-restart',
  'debug-restart-frame',
  'debug-reverse-continue',
  'debug-stackframe',
  'debug-stackframe-active',
  'debug-start',
  'debug-step-back',
  'debug-step-into',
  'debug-step-out',
  'debug-step-over',
  'debug-stop',
  'desktop-download',
  'device-camera',
  'device-camera-video',
  'device-desktop',
  'device-mobile',
  'diff',
  'diff-added',
  'diff-ignored',
  'diff-modified',
  'diff-removed',
  'diff-renamed',
  'discard',
  'edit',
  'editor-layout',
  'ellipsis',
  'empty-window',
  'error',
  'exclude',
  'expand-all',
  'export',
  'extensions',
  'eye',
  'eye-closed',
  'feedback',
  'file',
  'file-add',
  'file-binary',
  'file-code',
  'file-media',
  'file-pdf',
  'file-submodule',
  'file-symlink-directory',
  'file-symlink-file',
  'file-zip',
  'files',
  'filter',
  'filter-filled',
  'flame',
  'fold',
  'fold-down',
  'fold-up',
  'folder',
  'folder-active',
  'folder-library',
  'folder-opened',
  'game',
  'gear',
  'gift',
  'gist',
  'gist-secret',
  'git-commit',
  'git-compare',
  'git-merge',
  'git-pull-request',
  'git-pull-request-closed',
  'git-pull-request-create',
  'git-pull-request-draft',
  'github',
  'github-action',
  'github-alt',
  'github-inverted',
  'globe',
  'go-to-file',
  'grabber',
  'graph',
  'graph-left',
  'graph-line',
  'graph-scatter',
  'gripper',
  'group-by-ref-type',
  'heart',
  'heart-filled',
  'history',
  'home',
  'horizontal-rule',
  'hubot',
  'inbox',
  'info',
  'insert',
  'inspect',
  'issue-closed',
  'issue-draft',
  'issue-opened',
  'issue-reopened',
  'issues',
  'italic',
  'jersey',
  'json',
  'kebab-vertical',
  'key',
  'law',
  'layers',
  'layers-active',
  'layers-dot',
  'layout',
  'layout-activitybar-left',
  'layout-activitybar-right',
  'layout-centered',
  'layout-menubar',
  'layout-panel',
  'layout-panel-center',
  'layout-panel-justify',
  'layout-panel-left',
  'layout-panel-off',
  'layout-panel-right',
  'layout-sidebar-left',
  'layout-sidebar-left-off',
  'layout-sidebar-right',
  'layout-sidebar-right-off',
  'layout-statusbar',
  'library',
  'lightbulb',
  'lightbulb-autofix',
  'link',
  'link-external',
  'list-filter',
  'list-flat',
  'list-ordered',
  'list-selection',
  'list-tree',
  'list-unordered',
  'live-share',
  'loading',
  'location',
  'lock',
  'lock-small',
  'magnet',
  'mail',
  'mail-read',
  'map',
  'markdown',
  'megaphone',
  'mention',
  'menu',
  'merge',
  'milestone',
  'mirror',
  'mortar-board',
  'move',
  'multiple-windows',
  'music',
  'mute',
  'new-file',
  'new-folder',
  'newline',
  'no-newline',
  'note',
  'notebook',
  'notebook-template',
  'notification',
  'octoface',
  'open-preview',
  'organization',
  'output',
  'package',
  'paintcan',
  'pass',
  'pass-filled',
  'pin',
  'pinned',
  'pinned-dirty',
  'pie-chart',
  'play',
  'play-circle',
  'plug',
  'preserve-case',
  'preview',
  'primitive-square',
  'project',
  'pulse',
  'question',
  'quote',
  'radio-tower',
  'reactions',
  'record',
  'record-keys',
  'record-small',
  'redo',
  'references',
  'refresh',
  'regex',
  'remote',
  'remote-explorer',
  'remove',
  'replace',
  'replace-all',
  'reply',
  'repo',
  'repo-clone',
  'repo-create',
  'repo-delete',
  'repo-force-push',
  'repo-forked',
  'repo-pull',
  'repo-push',
  'report',
  'request-changes',
  'rocket',
  'root-folder',
  'root-folder-opened',
  'rss',
  'ruby',
  'run-above',
  'run-all',
  'run-below',
  'run-errors',
  'save',
  'save-all',
  'save-as',
  'screen-full',
  'screen-normal',
  'search',
  'search-fuzzy',
  'search-save',
  'search-stop',
  'server',
  'server-environment',
  'server-process',
  'settings',
  'settings-gear',
  'shield',
  'sign-in',
  'sign-out',
  'smiley',
  'sort-precedence',
  'source-control',
  'split-horizontal',
  'split-vertical',
  'squirrel',
  'star',
  'star-empty',
  'star-full',
  'star-half',
  'stop-circle',
  'symbol-array',
  'symbol-boolean',
  'symbol-class',
  'symbol-color',
  'symbol-constant',
  'symbol-constructor',
  'symbol-enum',
  'symbol-enum-member',
  'symbol-event',
  'symbol-field',
  'symbol-file',
  'symbol-interface',
  'symbol-key',
  'symbol-keyword',
  'symbol-method',
  'symbol-misc',
  'symbol-namespace',
  'symbol-numeric',
  'symbol-operator',
  'symbol-parameter',
  'symbol-property',
  'symbol-ruler',
  'symbol-snippet',
  'symbol-string',
  'symbol-structure',
  'symbol-variable',
  'sync',
  'sync-ignored',
  'table',
  'tag',
  'target',
  'tasklist',
  'telescope',
  'terminal',
  'terminal-bash',
  'terminal-cmd',
  'terminal-debian',
  'terminal-linux',
  'terminal-powershell',
  'terminal-tmux',
  'terminal-ubuntu',
  'text-size',
  'three-bars',
  'thumbsdown',
  'thumbsup',
  'tools',
  'trash',
  'triangle-down',
  'triangle-left',
  'triangle-right',
  'triangle-up',
  'twitter',
  'type-hierarchy',
  'type-hierarchy-sub',
  'type-hierarchy-super',
  'unfold',
  'ungroup-by-ref-type',
  'unlock',
  'unmute',
  'unverified',
  'variable-group',
  'verified',
  'verified-filled',
  'versions',
  'vm',
  'vm-active',
  'vm-connect',
  'vm-outline',
  'vm-running',
  'wand',
  'warning',
  'watch',
  'whitespace',
  'whole-word',
  'window',
  'workspace-trusted',
  'workspace-unknown',
  'workspace-untrusted',
  'wrench',
  'wrench-subaction',
  'x',
  'zap',
  'zoom-in',
  'zoom-out'
]

const PRESET_COLORS = ['#EA4335', '#4285F4', '#FBBC04', '#34A853', '#9334E9', '#EC4899', '#F97316', '#06B6D4']

const LANGUAGES = [
  { value: '', label: 'System Default' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'ar-SA', label: 'العربية' },
  { value: 'hi-IN', label: 'हिन्दी' }
]

export function ProfileForm({ profile, onSubmit, onCancel }: ProfileFormProps): React.ReactElement {
  const [name, setName] = useState(profile?.name || '')
  const [homeUrl, setHomeUrl] = useState(profile?.homeUrl || '')
  const [iconType, setIconType] = useState<'preset' | 'custom'>(profile?.icon === 'custom' ? 'custom' : 'preset')
  const [icon, setIcon] = useState(profile?.icon || 'account')
  const [iconColor, setIconColor] = useState(profile?.iconColor || '#3B82F6')
  const [customIconFilename, setCustomIconFilename] = useState(profile?.customIconPath || '')
  const [customIconPreview, setCustomIconPreview] = useState<string | null>(null)
  const [language, setLanguage] = useState(profile?.language || '')
  const [notificationMode, setNotificationMode] = useState<'allow-all' | 'ask' | 'deny-all'>(
    profile?.notificationMode || 'ask'
  )
  const [showAllIcons, setShowAllIcons] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setCustomIconPreview(base64)
      
      try {
        const filename = await window.iconApi.upload(base64)
        setCustomIconFilename(filename)
        setIconType('custom')
        setIcon('custom')
      } catch (error) {
        console.error('Failed to upload icon:', error)
        alert('Failed to upload icon')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !homeUrl.trim()) {
      alert('Please fill in all required fields')
      return
    }

    onSubmit({
      name: name.trim(),
      homeUrl: homeUrl.trim(),
      icon: iconType === 'custom' ? 'custom' : icon,
      iconColor,
      customIconPath: iconType === 'custom' ? customIconFilename : undefined,
      language: language || undefined,
      notificationMode,
      notificationPermissions: profile?.notificationPermissions || {}
    })
  }

  const iconList = showAllIcons ? ALL_ICONS : PRESET_ICONS

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Profile Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Profile Name <span className="text-red-500">*</span>
        </label>
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Work Gmail" required />
      </div>

      {/* Home URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Home URL <span className="text-red-500">*</span>
        </label>
        <Input type="url" value={homeUrl} onChange={(e) => setHomeUrl(e.target.value)} placeholder="https://gmail.com" required />
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Browser language for this profile.</p>
      </div>

      {/* Notification Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notifications</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="notificationMode"
              value="allow-all"
              checked={notificationMode === 'allow-all'}
              onChange={(e) => setNotificationMode(e.target.value as 'allow-all' | 'ask' | 'deny-all')}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium">Allow all</p>
              <p className="text-xs text-gray-500">Automatically allow notifications from all websites</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="notificationMode"
              value="ask"
              checked={notificationMode === 'ask'}
              onChange={(e) => setNotificationMode(e.target.value as 'allow-all' | 'ask' | 'deny-all')}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium">Ask when a site wants to show notifications (recommended)</p>
              <p className="text-xs text-gray-500">You'll see a dialog when websites request permission</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="notificationMode"
              value="deny-all"
              checked={notificationMode === 'deny-all'}
              onChange={(e) => setNotificationMode(e.target.value as 'allow-all' | 'ask' | 'deny-all')}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium">Block all</p>
              <p className="text-xs text-gray-500">Never allow notifications from any website</p>
            </div>
          </label>
        </div>
      </div>

      {/* Icon Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Icon Type</label>
        <div className="flex gap-2 mb-3">
          <Button type="button" variant={iconType === 'preset' ? 'default' : 'outline'} size="sm" onClick={() => setIconType('preset')}>
            Preset Icons
          </Button>
          <Button type="button" variant={iconType === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setIconType('custom')}>
            Custom Upload
          </Button>
        </div>

        {iconType === 'preset' ? (
          <>
            <div className="grid grid-cols-8 gap-2 mb-2 max-h-96 overflow-y-auto">
              {iconList.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`w-12 h-12 flex items-center justify-center rounded border-2 transition-colors ${
                    icon === iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={iconName}
                >
                  <span className={`codicon codicon-${iconName} text-2xl`} style={{ color: iconColor }} />
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllIcons(!showAllIcons)}>
              {showAllIcons ? 'Show Less' : `Show All Icons (${ALL_ICONS.length})`}
            </Button>
          </>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
            {customIconPreview || customIconFilename ? (
              <div className="space-y-2">
                {customIconPreview && (
                  <img src={customIconPreview} alt="Custom icon" className="w-16 h-16 mx-auto rounded" />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Change Icon
                </Button>
              </div>
            ) : (
              <div>
                <span className="codicon codicon-cloud-upload text-4xl text-gray-400 block mb-2" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Upload Icon
                </Button>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG (Recommended: 64x64px)</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex gap-2 items-center mb-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setIconColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                iconColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-8 h-8 rounded border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50"
          >
            <span className="codicon codicon-paintcan text-sm" />
          </button>
        </div>
        {showColorPicker && (
          <div className="flex gap-2 items-center">
            <Input
              type="color"
              value={iconColor}
              onChange={(e) => setIconColor(e.target.value)}
              className="w-20 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={iconColor}
              onChange={(e) => setIconColor(e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{profile ? 'Update' : 'Create'} Profile</Button>
      </div>
    </form>
  )
}
