import type React from 'react'
import type { CertErrorInfo } from '../../../shared/types'
import { Button } from './ui/button'

interface CertErrorViewProps {
  info: CertErrorInfo
  onLeave: () => void
  onProceed: () => void
}

// What Chromium's error name means for the person looking at the screen
const ERROR_REASONS: Record<string, string> = {
  ERR_CERT_AUTHORITY_INVALID:
    'The certificate was not issued by an authority this computer trusts. It may be self-signed or issued by a private authority.',
  ERR_CERT_DATE_INVALID: 'The certificate has expired or is not valid yet.',
  ERR_CERT_COMMON_NAME_INVALID: 'The certificate was issued for a different host name.',
  ERR_CERT_REVOKED: 'The certificate has been revoked by its issuer.',
  ERR_CERT_WEAK_SIGNATURE_ALGORITHM: 'The certificate uses a weak signature algorithm.',
  ERR_CERT_WEAK_KEY: 'The certificate uses a weak key.',
}

function formatDate(seconds?: number): string {
  return seconds ? new Date(seconds * 1000).toLocaleString() : '-'
}

export function CertErrorView({
  info,
  onLeave,
  onProceed,
}: CertErrorViewProps): React.ReactElement {
  const reason = ERROR_REASONS[info.error] ?? 'The certificate of this site could not be verified.'

  return (
    // m-auto (not justify-center) keeps the top reachable when the card is taller than the window
    <div className="flex bg-gray-50 h-full w-full overflow-auto">
      <div className="m-auto max-w-lg p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="text-center mb-4">
          <span className="codicon codicon-warning text-6xl text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
          Your connection is not private
        </h2>
        <p className="text-gray-600 mb-2">
          Someone may be trying to impersonate <strong>{info.hostname}</strong>, or its certificate
          is misconfigured. Information you send to this site could be seen by others.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {reason} <span className="font-mono">({info.error})</span>
        </p>

        <details className="mb-6 text-sm text-gray-600">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Details</summary>
          <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 break-all">
            <dt className="text-gray-400">Address</dt>
            <dd>{info.url}</dd>
            <dt className="text-gray-400">Subject</dt>
            <dd>{info.subject ?? '-'}</dd>
            <dt className="text-gray-400">Issuer</dt>
            <dd>{info.issuer ?? '-'}</dd>
            <dt className="text-gray-400">Valid from</dt>
            <dd>{formatDate(info.validFrom)}</dd>
            <dt className="text-gray-400">Valid until</dt>
            <dd>{formatDate(info.validTo)}</dd>
            <dt className="text-gray-400">Fingerprint</dt>
            <dd className="font-mono text-xs">{info.fingerprint ?? '-'}</dd>
          </dl>
        </details>

        <Button onClick={onLeave} className="w-full mb-3">
          Back to safety
        </Button>
        <Button variant="ghost" onClick={onProceed} className="w-full text-red-600">
          Proceed to {info.hostname} (unsafe)
        </Button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          This only applies to this profile, until the app is closed.
        </p>
      </div>
    </div>
  )
}
