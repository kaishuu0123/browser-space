import { app } from 'electron'
import type { WebContentsView } from 'electron'
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
    copyLink: 'リンクのURLをコピー',
    copyImage: '画像をコピー',
    copyImageAddress: '画像のURLをコピー',
    inspect: '要素を検証',
  }
}

export function applyContextMenu(view: WebContentsView): () => void {
  const isJapanese = app.getLocale().startsWith('ja')

  return contextMenu({
    window: view,
    showCopyLink: true,
    showSaveImageAs: true,
    showCopyImageAddress: true,
    ...(isJapanese ? { labels: getJapaneseLabels() } : {}),
  })
}
