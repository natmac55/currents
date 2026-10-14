import type { FeedItem } from "@/lib/types"

export const CONNECTIONS_PAGE_URL = "https://www.nytimes.com/games/connections"
const CONNECTIONS_JSON = "https://www.nytimes.com/svc/connections/v2"

type ConnectionsPuzzle = {
  id?: number
  print_date?: string
  editor?: string
  status?: string
}

export function isConnectionsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    return (
      host === "nytimes.com" &&
      /^\/games\/connections\/?$/.test(parsed.pathname)
    )
  } catch {
    return false
  }
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function publishedAt(isoDate: string): string {
  // Midday UTC keeps the calendar day stable across US timezones.
  return `${isoDate}T12:00:00.000Z`
}

/** Build a spoiler-free feed item from puzzle metadata only. */
export function connectionsItemFromPuzzle(
  puzzle: ConnectionsPuzzle,
  feedId: string
): FeedItem | null {
  if (!puzzle.print_date || puzzle.status !== "OK") return null
  const label = formatDateLabel(puzzle.print_date)
  const number = typeof puzzle.id === "number" ? `#${puzzle.id}` : "daily"
  const editor = puzzle.editor?.trim()
  return {
    id: `connections:${puzzle.print_date}`,
    feedId,
    feedTitle: "NYT Connections",
    feedUrl: CONNECTIONS_PAGE_URL,
    title: `Connections ${number} — ${label}`,
    link: CONNECTIONS_PAGE_URL,
    summary: editor
      ? `A new Connections puzzle is up. Edited by ${editor}.`
      : "A new Connections puzzle is up.",
    publishedAt: publishedAt(puzzle.print_date),
    publishedLabel: label,
  }
}

/** NYT Games days roll on America/New_York, not UTC. */
export function connectionsTodayNy(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function dayStringNy(todayNy: string, offsetDays: number): string {
  const [year, month, day] = todayNy.split("-").map(Number)
  const utc = Date.UTC(year, month - 1, day + offsetDays, 12)
  return new Date(utc).toISOString().slice(0, 10)
}

/**
 * Poll NYT's dated Connections JSON for the last ~2 weeks through
 * *today in Eastern time*. Tomorrow may already be on their CDN, but we
 * don't surface it until that calendar day in America/New_York.
 * Never includes category answers.
 */
export async function fetchConnectionsItems(
  feedId: string
): Promise<FeedItem[]> {
  const todayNy = connectionsTodayNy()
  const dates = Array.from({ length: 16 }, (_, i) => dayStringNy(todayNy, -i))
  const items: FeedItem[] = []

  await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${CONNECTIONS_JSON}/${date}.json`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; CurrentsRSS/1.0; personal reader)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10_000),
          // Fresh enough for a daily game; avoid sticky empty caches.
          cache: "no-store",
        })
        if (!res.ok) return
        const puzzle = (await res.json()) as ConnectionsPuzzle
        // Defend against CDN returning a future print_date early.
        if (puzzle.print_date && puzzle.print_date > todayNy) return
        const item = connectionsItemFromPuzzle(puzzle, feedId)
        if (item) items.push(item)
      } catch {
        // Missing dates / network blips are normal — skip.
      }
    })
  )

  items.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0
    return bTime - aTime
  })

  return items
}
