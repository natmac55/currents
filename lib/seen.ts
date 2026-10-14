export const SEEN_STORAGE_KEY = "currents.seen.v1"
const MAX_SEEN = 2_500

export function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  } catch {
    return new Set()
  }
}

export function saveSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return
  let list = [...ids]
  if (list.length > MAX_SEEN) {
    // Drop the oldest entries (Set insertion order).
    list = list.slice(list.length - MAX_SEEN)
  }
  window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(list))
}

export function markSeen(ids: Set<string>, id: string): Set<string> {
  if (ids.has(id)) return ids
  const next = new Set(ids)
  next.add(id)
  return next
}

export function markUnseen(ids: Set<string>, id: string): Set<string> {
  if (!ids.has(id)) return ids
  const next = new Set(ids)
  next.delete(id)
  return next
}

export function markManySeen(ids: Set<string>, itemIds: string[]): Set<string> {
  const next = new Set(ids)
  for (const id of itemIds) next.add(id)
  return next
}
