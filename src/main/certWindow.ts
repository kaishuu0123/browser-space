import { type BaseWindow, BrowserWindow } from 'electron'
import type { CertDetails } from '../shared/types'

export interface CertWindowContent {
  // 'secure' | 'warning' only changes the icon and colour of the heading
  tone: 'secure' | 'warning'
  title: string
  text: string
  address: string
  // Table of the certificate; left out for pages that have none
  details?: CertDetails | null
}

// Certificate fields come from the server, so they are escaped before they go into the page
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(seconds?: number): string {
  return seconds ? new Date(seconds * 1000).toLocaleString() : '-'
}

function buildHtml(content: CertWindowContent): string {
  const row = (label: string, value: string, mono = false) =>
    `<tr><th>${label}</th><td${mono ? ' class="mono"' : ''}>${escapeHtml(value)}</td></tr>`
  const d = content.details
  const rows = [
    row('Address', content.address),
    ...(d
      ? [
          row('Subject', d.subject ?? '-'),
          row('Issuer', d.issuer ?? '-'),
          row('Valid from', formatDate(d.validFrom)),
          row('Valid until', formatDate(d.validTo)),
          row('Fingerprint', d.fingerprint ?? '-', true),
        ]
      : []),
  ].join('')
  const color = content.tone === 'warning' ? '#dc2626' : '#16a34a'
  const mark = content.tone === 'warning' ? '&#9888;' : '&#128274;'

  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>Certificate</title>
<style>
  html, body { margin: 0; height: 100%; }
  body { box-sizing: border-box; padding: 20px; background: #fff; color: #1f2937;
    font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; flex-direction: column; }
  h1 { margin: 0 0 4px; font-size: 15px; display: flex; align-items: center; gap: 8px; color: ${color}; }
  p { margin: 0 0 14px; color: #6b7280; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th, td { padding: 6px 8px; border-top: 1px solid #e5e7eb; text-align: left; vertical-align: top; word-break: break-all; }
  th { width: 90px; font-weight: 500; color: #9ca3af; }
  tr:last-child th, tr:last-child td { border-bottom: 1px solid #e5e7eb; }
  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
  .actions { margin-top: auto; padding-top: 14px; text-align: right; }
  button { padding: 5px 20px; border: 0; border-radius: 6px; background: #2563eb; color: #fff; font: inherit; cursor: pointer; }
  button:hover { background: #1d4ed8; }
</style></head>
<body>
  <h1><span>${mark}</span>${escapeHtml(content.title)}</h1>
  <p>${escapeHtml(content.text)}</p>
  <table>${rows}</table>
  <div class="actions"><button id="ok" autofocus>OK</button></div>
  <script>
    document.getElementById('ok').addEventListener('click', () => window.close())
    addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') window.close() })
  </script>
</body></html>`
}

// A small window with the certificate as a table. It is modal to the main window, and the
// promise settles when it is closed.
export function showCertWindow(parent: BaseWindow, content: CertWindowContent): Promise<void> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      parent: parent as BrowserWindow,
      modal: true,
      width: 480,
      height: content.details ? 360 : 230,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      title: 'Certificate',
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    })
    win.removeMenu()
    win.on('closed', () => resolve())
    // The page is static; nothing in it may navigate or open windows
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (event) => event.preventDefault())
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(content))}`)
  })
}
