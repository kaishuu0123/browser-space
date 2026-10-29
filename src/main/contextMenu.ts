import type { MenuItemConstructorOptions, WebContentsView } from 'electron'
import { app } from 'electron'
import contextMenuModule from 'electron-context-menu'

// electron-context-menu is ESM; handle both default and module.default
const contextMenu =
  (contextMenuModule as unknown as { default: typeof contextMenuModule }).default ??
  contextMenuModule

function getJapaneseLabels(): import('electron-context-menu').Labels {
  return {
    learnSpelling: 'スペルの学習',
    lookUpSelection: '「{selection}」を調べる',
    searchWithGoogle: 'Googleで検索',
    cut: '切り取り',
    copy: 'コピー',
    paste: '貼り付け',
    selectAll: 'すべてを選択',
    saveImage: '画像を保存',
    saveImageAs: '名前を付けて画像を保存',
    saveLinkAs: '名前を付けてリンク先を保存',
    copyLink: 'リンクのアドレスをコピー',
    copyImage: '画像をコピー',
    copyImageAddress: '画像のアドレスをコピー',
    inspect: '検証',
  }
}

type SaveLinkAs = (options: object) => MenuItemConstructorOptions

// Labels of the items this file adds on top of the library's
const TEXT = {
  en: {
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    print: 'Print…',
    viewSource: 'View page source',
    undo: 'Undo',
    redo: 'Redo',
    pastePlain: 'Paste as plain text',
    openLink: 'Open link in new tab',
    openImage: 'Open image in new tab',
    searchSelection: 'Search Google for “{selection}”',
  },
  ja: {
    back: '戻る',
    forward: '進む',
    reload: '再読み込み',
    print: '印刷…',
    viewSource: 'ページのソースを表示',
    undo: '元に戻す',
    redo: 'やり直し',
    pastePlain: 'テキストとして貼り付け',
    openLink: 'リンクを新しいタブで開く',
    openImage: '画像を新しいタブで開く',
    searchSelection: 'Google で「{selection}」を検索',
  },
} as const

// What the page menu needs from the tab that owns the view
export interface PageMenuHandlers {
  // Open a URL in a new tab next to this one
  openInNewTab: (url: string, options?: { background?: boolean }) => void
}

export function applyContextMenu(view: WebContentsView, page?: PageMenuHandlers): () => void {
  const isJapanese = app.getLocale().startsWith('ja')
  const labels = isJapanese ? getJapaneseLabels() : {}

  // The app's own screens (renderer view) keep the library's plain menu
  if (!page) {
    return contextMenu({
      window: view,
      showCopyLink: true,
      showSaveImageAs: true,
      showCopyImageAddress: true,
      labels,
    })
  }

  const text = isJapanese ? TEXT.ja : TEXT.en
  const contents = view.webContents

  // The page menu, arranged like Chrome's: what is under the pointer decides the items
  return contextMenu({
    window: view,
    labels,
    showSelectAll: true,
    showInspectElement: true,
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showSaveLinkAs: true,
    menu: (actions, params, _window, dictionarySuggestions) => {
      const hasSelection = params.selectionText.trim().length > 0
      const onLink = params.linkURL.length > 0
      const onImage = params.mediaType === 'image'
      const onPage = !params.isEditable && !hasSelection && !onLink && params.mediaType === 'none'
      const history = contents.navigationHistory

      const items: MenuItemConstructorOptions[] = [
        // Editable field: spelling, undo/redo, clipboard
        ...dictionarySuggestions,
        actions.separator(),
        actions.learnSpelling({}),
        {
          label: text.undo,
          visible: params.isEditable,
          enabled: params.editFlags.canUndo,
          click: () => contents.undo(),
        },
        {
          label: text.redo,
          visible: params.isEditable,
          enabled: params.editFlags.canRedo,
          click: () => contents.redo(),
        },
        actions.separator(),
        actions.cut({}),
        actions.copy({}),
        actions.paste({}),
        {
          label: text.pastePlain,
          visible: params.isEditable,
          enabled: params.editFlags.canPaste,
          click: () => contents.pasteAndMatchStyle(),
        },
        // Like Chrome, only in fields (the page itself is selected with the keyboard)
        { ...actions.selectAll({}), visible: params.isEditable },
        actions.separator(),

        // Selection outside a field
        {
          label: text.searchSelection,
          visible: hasSelection && !params.isEditable,
          click: () =>
            page.openInNewTab(
              `https://www.google.com/search?q=${encodeURIComponent(params.selectionText.trim())}`
            ),
        },
        actions.separator(),

        // Link
        {
          label: text.openLink,
          visible: onLink,
          click: () => page.openInNewTab(params.linkURL),
        },
        actions.copyLink({}),
        // The library has this action, but its typings leave it out
        (actions as typeof actions & { saveLinkAs: SaveLinkAs }).saveLinkAs({}),
        actions.separator(),

        // Image / video
        {
          label: text.openImage,
          visible: onImage && params.srcURL.length > 0,
          click: () => page.openInNewTab(params.srcURL),
        },
        actions.saveImage({}),
        actions.saveImageAs({}),
        actions.copyImage({}),
        actions.copyImageAddress({}),
        actions.saveVideo({}),
        actions.saveVideoAs({}),
        actions.copyVideoAddress({}),
        actions.separator(),

        // The page itself (nothing under the pointer)
        {
          label: text.back,
          visible: onPage,
          enabled: history.canGoBack(),
          click: () => history.goBack(),
        },
        {
          label: text.forward,
          visible: onPage,
          enabled: history.canGoForward(),
          click: () => history.goForward(),
        },
        { label: text.reload, visible: onPage, click: () => contents.reload() },
        actions.separator(),
        {
          label: text.print,
          visible: onPage || (hasSelection && !params.isEditable),
          click: () => contents.print(),
        },
        {
          label: text.viewSource,
          visible: onPage,
          click: () => page.openInNewTab(`view-source:${contents.getURL()}`),
        },
        actions.separator(),
        actions.inspect(),
      ]

      return items
    },
  })
}
