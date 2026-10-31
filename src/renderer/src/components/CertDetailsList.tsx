import type React from 'react'
import { formatIsoLocal } from '../../../shared/format'
import type { CertDetails } from '../../../shared/types'

interface CertDetailsListProps {
  details: CertDetails
  // Shown first, e.g. the address of the page
  address?: string
}

export function CertDetailsList({ details, address }: CertDetailsListProps): React.ReactElement {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-all text-sm text-gray-600">
      {address && (
        <>
          <dt className="text-gray-400">Address</dt>
          <dd>{address}</dd>
        </>
      )}
      <dt className="text-gray-400">Subject</dt>
      <dd>{details.subject ?? '-'}</dd>
      <dt className="text-gray-400">Issuer</dt>
      <dd>{details.issuer ?? '-'}</dd>
      <dt className="text-gray-400">Valid from</dt>
      <dd>{formatIsoLocal(details.validFrom)}</dd>
      <dt className="text-gray-400">Valid until</dt>
      <dd>{formatIsoLocal(details.validTo)}</dd>
      <dt className="text-gray-400">Fingerprint</dt>
      <dd className="font-mono text-xs">{details.fingerprint ?? '-'}</dd>
    </dl>
  )
}
