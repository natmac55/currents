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

function dayString(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

/**
 * Poll NYT's dated Connections JSON for the last ~2 weeks (+ tomorrow,
 * since puzzles often publish early). Never includes category answers.
 */
export async function fetchConnectionsItems(
  feedId: string
): Promise<FeedItem[]> {
  const now = new Date()
  const dates = Array.from({ length: 16 }, (_, i) => dayString(now, 1 - i))
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
