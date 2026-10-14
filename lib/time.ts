/** Relative age for list timestamps (e.g. "3h ago"). */
export function formatRelativeTime(
  iso: string | null | undefined,
  nowMs: number = Date.now()
): string | null {
  if (!iso) return null
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return null
  const delta = Math.max(0, nowMs - then)
  const sec = Math.floor(delta / 1000)
  if (sec < 45) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week}w ago`
  return null
}

export function formatAbsoluteTime(iso: string | null | undefined): string {
  if (!iso) return "Unknown date"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Unknown date"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
