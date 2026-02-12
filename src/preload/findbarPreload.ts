import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('findbarApi', {
  next: () => ipcRenderer.send('findbar:next'),
  previous: () => ipcRenderer.send('findbar:previous'),
  inputChange: (text: string) => ipcRenderer.send('findbar:input-change', text),
  matchCase: (value: boolean) => ipcRenderer.send('findbar:match-case', value),
  close: () => ipcRenderer.send('findbar:close'),
  onMatches: (cb: (matches: { active: number; total: number }) => void) => {
    ipcRenderer.on('findbar:matches', (_e, matches) => cb(matches))
  },
  onFocusInput: (cb: () => void) => {
    ipcRenderer.on('findbar:focus-input', () => cb())
  },
  onRestore: (
    cb: (state: {
      text: string
      matchCase: boolean
      matches: { active: number; total: number }
    }) => void
  ) => {
    ipcRenderer.on('findbar:restore', (_e, state) => cb(state))
  },
})
