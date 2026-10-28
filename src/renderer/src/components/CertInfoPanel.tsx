import type React from 'react'
import { useEffect } from 'react'
import { TAB_BAR_HEIGHT, TOOLBAR_HEIGHT } from '../../../shared/layout'
import type { CertInfo } from '../../../shared/types'
import { CertDetailsList } from './CertDetailsList'
import type { PageSecurity } from './Toolbar'

interface CertInfoPanelProps {
  security: PageSecurity
  info: CertInfo | null
  // Address of the page the panel is about
  url: string
  // Snapshot of the page that is hidden behind the panel (so it still looks like it is there)
  snapshot: string | null
  // Width of the sidebar (the panel covers the area to its right, below the toolbar)
  left: number
  onClose: () => void
}

const HEADINGS: Record<PageSecurity, { title: string; text: string }> = {
  secure: {
    title: 'Connection is secure',
    text: 'Information you send to this site is encrypted, and its certificate is valid.',
  },
  insecure: {
    title: 'Connection is not secure',
    text: 'Information you send to this site (passwords, card numbers...) can be seen by others.',
  },
  bypassed: {
    title: 'Certificate is not valid',
    text: 'This page was opened because you chose to proceed despite a certificate error.',
  },
  error: {
    title: 'Certificate is not valid',
    text: 'The certificate of this site could not be verified.',
  },
  none: { title: '', text: '' },
}

// A small panel under the address bar's lock, over a snapshot of the page
export function CertInfoPanel({
  security,
  info,
  url,
  snapshot,
  left,
  onClose,
}: CertInfoPanelProps): React.ReactElement {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const heading = HEADINGS[security]
  const warn = security === 'insecure' || security === 'bypassed' || security === 'error'

  return (
    <div
      className="fixed right-0 bottom-0 z-40"
      style={{ left, top: TAB_BAR_HEIGHT + TOOLBAR_HEIGHT }}
    >
      {snapshot && <img src={snapshot} alt="" className="absolute inset-0 w-full h-full" />}
      {/* Click anywhere outside the panel to close it */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
      />
      <div className="absolute left-2 top-1 w-[22rem] max-w-[calc(100%-1rem)] max-h-[calc(100%-0.5rem)] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`codicon ${warn ? 'codicon-warning text-red-500' : 'codicon-lock text-gray-500'}`}
          />
          <h2 className="text-sm font-semibold text-gray-800">{heading.title}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">{heading.text}</p>
        {info ? (
          <CertDetailsList details={info} address={url} />
        ) : (
          <p className="text-xs text-gray-400 break-all">
            {security === 'insecure'
              ? url
              : 'No certificate was recorded for this page yet. Reload it to see its details.'}
          </p>
        )}
      </div>
    </div>
  )
}
