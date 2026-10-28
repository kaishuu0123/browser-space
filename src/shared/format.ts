// Seconds since the epoch as an ISO 8601 date and time in the time zone of this computer, with
// its offset: 2026-09-26T22:49:11+09:00 (or ...Z when the computer is on UTC). '-' without a value.
export function formatIsoLocal(seconds?: number): string {
  if (!seconds) return '-'
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return '-'

  const pad = (value: number) => String(value).padStart(2, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const offset =
    offsetMinutes === 0
      ? 'Z'
      : `${offsetMinutes > 0 ? '+' : '-'}${pad(Math.trunc(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
  )
}
