import { BrowserWindow, BaseWindow, WebContents, ipcMain } from 'electron'
import path from 'path'

// electron-vite のビルド出力構造:
//   out/main/index.js        ← __dirname = out/main
//   out/main/findbar.html    ← electron.vite.config.ts でコピーするように設定済み
//   out/preload/findbarPreload.js ← preload エントリとしてビルド

interface Matches {
  active: number
  total: number
}

export class FindbarWindow {
  private window: BrowserWindow | null = null
  private findableContents: WebContents
  private parent: BaseWindow
  private lastText = ''
  private matchCaseFlag = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private _finding = false
  private matches: Matches = { active: 0, total: 0 }

  // インスタンスをwebContentsに紐付けて管理
  private static instances = new Map<number, FindbarWindow>()

  constructor(parent: BaseWindow, findableContents: WebContents) {
    this.parent = parent
    this.findableContents = findableContents

    // found-in-page イベントを受け取ってfindbarに送信
    this.findableContents.on('found-in-page', (_e, result) => {
      this._finding = false
      this.matches = { active: result.activeMatchOrdinal, total: result.matches }
      this.window?.webContents.send('findbar:matches', this.matches)
    })

    FindbarWindow.instances.set(findableContents.id, this)
  }

  static from(parent: BaseWindow, findableContents: WebContents): FindbarWindow {
    const existing = FindbarWindow.instances.get(findableContents.id)
    if (existing) return existing
    return new FindbarWindow(parent, findableContents)
  }

  static setupIpc(): void {
    ipcMain.on('findbar:next', (e) => {
      FindbarWindow.fromSender(e.sender)?.findNext()
    })
    ipcMain.on('findbar:previous', (e) => {
      FindbarWindow.fromSender(e.sender)?.findPrevious()
    })
    ipcMain.on('findbar:input-change', (e, text: string) => {
      FindbarWindow.fromSender(e.sender)?.debouncedStartFind(text)
    })
    ipcMain.on('findbar:match-case', (e, value: boolean) => {
      FindbarWindow.fromSender(e.sender)?.setMatchCase(value)
    })
    ipcMain.on('findbar:close', (e) => {
      FindbarWindow.fromSender(e.sender)?.close()
    })
  }

  private static fromSender(sender: WebContents): FindbarWindow | undefined {
    // sender はfindbarウィンドウのwebContents → instancesはfindableContentsのidで管理
    // findbarウィンドウ側からの送信なので、全インスタンスからwindowのwebContentsで探す
    for (const instance of FindbarWindow.instances.values()) {
      if (instance.window?.webContents.id === sender.id) {
        return instance
      }
    }
    return undefined
  }

  open(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus()
      this.window.webContents.send('findbar:focus-input')
      return
    }

    const FINDBAR_WIDTH = 372
    const FINDBAR_HEIGHT = 52

    const getPositionBounds = () => {
      const wb = this.parent.getBounds()
      const cb = (this.parent as BrowserWindow).getContentBounds()
      // タイトルバーの実際の高さ（OS・スケーリング非依存）
      const titlebarHeight = cb.y - wb.y
      // 右フレーム幅 + ウィンドウボタン群（最小化・最大化・閉じる）を避けるマージン
      const WIN_BUTTONS_WIDTH = 138
      const rightMargin = wb.x + wb.width - (cb.x + cb.width) + WIN_BUTTONS_WIDTH
      return {
        x: wb.x + wb.width - FINDBAR_WIDTH - rightMargin,
        y: wb.y + titlebarHeight,
      }
    }

    const initialPos = getPositionBounds()
    this.window = new BrowserWindow({
      width: FINDBAR_WIDTH,
      height: FINDBAR_HEIGHT,
      x: initialPos.x,
      y: initialPos.y,
      resizable: false,
      movable: false,
      frame: false,
      roundedCorners: true,
      skipTaskbar: true,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,

      parent: this.parent,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/findbarPreload.js'),
      },
    })

    this.window.loadFile(path.join(__dirname, 'findbar.html'))

    this.window.once('ready-to-show', () => {
      this.window?.show()
      // 前回の検索テキストがあれば復元
      if (this.lastText) {
        this.window?.webContents.send('findbar:restore', {
          text: this.lastText,
          matchCase: this.matchCaseFlag,
          matches: this.matches,
        })
        this.startFind(this.lastText)
      }
    })

    // 親ウィンドウのリサイズ・移動に追従
    const updatePosition = () => {
      if (!this.window || this.window.isDestroyed()) return
      this.window.setBounds({
        ...getPositionBounds(),
        width: FINDBAR_WIDTH,
        height: FINDBAR_HEIGHT,
      })
    }
    this.parent.on('resize', updatePosition)
    this.parent.on('move', updatePosition)

    this.window.once('closed', () => {
      this.parent.off('resize', updatePosition)
      this.parent.off('move', updatePosition)
      this.findableContents.stopFindInPage('clearSelection')
      this.matches = { active: 0, total: 0 }
      this.window = null
    })

    // findbarウィンドウのキーボードショートカット（keyDownのみ処理）
    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      if (input.meta || input.control || input.alt) return

      const key = input.key.toLowerCase()
      if (key === 'enter') {
        event.preventDefault()
        if (input.shift) {
          this.findPrevious()
        } else {
          this.findNext()
        }
      } else if (key === 'escape') {
        event.preventDefault()
        this.close()
      }
    })
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  isOpen(): boolean {
    return !!this.window && !this.window.isDestroyed()
  }

  debouncedStartFind(text: string, delay = 300): void {
    // 空文字は即時クリア
    if (!text) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.startFind('')
      return
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.startFind(text)
    }, delay)
  }

  startFind(text: string): void {
    this.lastText = text
    if (!text) {
      this.findableContents.stopFindInPage('clearSelection')
      this.window?.webContents.send('findbar:matches', { active: 0, total: 0 })
      return
    }
    // findNext: false で新規検索として開始
    this.findableContents.findInPage(text, {
      matchCase: this.matchCaseFlag,
      findNext: false,
    })
  }

  findNext(): void {
    if (!this.lastText || this._finding) return
    this._finding = true
    this.findableContents.findInPage(this.lastText, {
      matchCase: this.matchCaseFlag,
      forward: true,
      findNext: true,
    })
  }

  findPrevious(): void {
    if (!this.lastText || this._finding) return
    this._finding = true
    this.findableContents.findInPage(this.lastText, {
      matchCase: this.matchCaseFlag,
      forward: false,
      findNext: true,
    })
  }

  setMatchCase(value: boolean): void {
    this.matchCaseFlag = value
    this.findableContents.stopFindInPage('clearSelection')
    this.startFind(this.lastText)
  }

  destroy(): void {
    this.close()
    FindbarWindow.instances.delete(this.findableContents.id)
  }

  static destroyForContents(findableContents: WebContents): void {
    const instance = FindbarWindow.instances.get(findableContents.id)
    if (instance) {
      instance.destroy()
    }
  }
}
