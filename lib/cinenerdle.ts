import type { FeedItem } from "@/lib/types"

export const CINENERDLE_ORIGIN = "https://www.cinenerdle.app"
const OFFICIAL_URL = `${CINENERDLE_ORIGIN}/api/puzzles/official`
const DAYCOUNTS_URL = `${CINENERDLE_ORIGIN}/api/puzzles/daycounts`

export type CinenerdleMode = "original" | "reversal" | "both"

type OfficialPuzzle = {
  daycount?: string
  puzzle_type?: string
  day_accepted?: number
  is_official?: boolean
  title?: string | null
  topic?: string | null
}

type Daycounts = {
  originalDayCount?: number
  nextMidnight?: string
}

export function isCinenerdleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return host === "cinenerdle.app"
  } catch {
    return false
  }
}

export function cinenerdleModeFromUrl(url: string): CinenerdleMode {
  try {
    const path = new URL(url).pathname.toLowerCase()
    if (path.includes("/puzzles/reversal")) return "reversal"
    if (path.includes("/puzzles/original")) return "original"
    return "both"
  } catch {
    return "both"
  }
}

/** Canonical subscription URL — one feed covers Original + Reversal. */
export function normalizeCinenerdleFeedUrl(): string {
  return `${CINENERDLE_ORIGIN}/`
}

export function normalizeCinenerdleUrl(mode: CinenerdleMode): string {
  if (mode === "original") return `${CINENERDLE_ORIGIN}/puzzles/original/latest`
  if (mode === "reversal") return `${CINENERDLE_ORIGIN}/puzzles/reversal/latest`
  return normalizeCinenerdleFeedUrl()
}

function labelForMode(mode: CinenerdleMode): string {
  if (mode === "original") return "CineNerdle Original"
  if (mode === "reversal") return "CineNerdle Reversal"
  return "CineNerdle"
}

function formatLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function dateForDayAccepted(
  dayAccepted: number,
  originalDayCount: number,
  nextMidnight: string
): string {
  const end = new Date(nextMidnight)
  if (Number.isNaN(end.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  const currentDayStart = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const daysAgo = originalDayCount - dayAccepted
  const d = new Date(currentDayStart.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

function puzzleLink(type: "original" | "reversal", daycount: string): string {
  return `${CINENERDLE_ORIGIN}/puzzles/${type}/${encodeURIComponent(daycount)}`
}

/** Spoiler-free item — never reads puzzle_data / answers. */
export function cinenerdleItemFromOfficial(
  puzzle: OfficialPuzzle,
  feedId: string,
  calendarDate: string
): FeedItem | null {
  const type = puzzle.puzzle_type
  const daycount = puzzle.daycount?.trim()
  if ((type !== "original" && type !== "reversal") || !daycount) return null

  const kind = type === "original" ? "Original" : "Reversal"
  const label = formatLabel(calendarDate)
  const topic = puzzle.topic?.trim()
  return {
    id: `cinenerdle:${type}:${daycount}`,
    feedId,
    feedTitle: `CineNerdle ${kind}`,
    feedUrl: normalizeCinenerdleUrl(type),
    title: `CineNerdle ${kind} ${daycount} — ${label}`,
    link: puzzleLink(type, daycount),
    summary: topic
      ? `A new ${kind.toLowerCase()} puzzle is up (${topic}).`
      : `A new ${kind.toLowerCase()} puzzle is up.`,
    publishedAt: `${calendarDate}T12:00:00.000Z`,
    publishedLabel: label,
  }
}

export async function fetchCinenerdleItems(
  feedId: string,
  mode: CinenerdleMode
): Promise<{ items: FeedItem[]; title: string }> {
  const [officialRes, daycountsRes] = await Promise.all([
    fetch(OFFICIAL_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; CurrentsRSS/1.0; personal reader)",
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    }),
    fetch(DAYCOUNTS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; CurrentsRSS/1.0; personal reader)",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }),
  ])

  if (!officialRes.ok) {
    throw new Error(`CineNerdle official list failed (${officialRes.status})`)
  }

  const official = (await officialRes.json()) as OfficialPuzzle[]
  const daycounts = daycountsRes.ok
    ? ((await daycountsRes.json()) as Daycounts)
    : {}
  const originalDayCount = daycounts.originalDayCount ?? 0
  const nextMidnight =
    daycounts.nextMidnight ?? new Date().toISOString()

  const wanted =
    mode === "both"
      ? new Set(["original", "reversal"])
      : new Set([mode])

  const picked: OfficialPuzzle[] = []
  const perType = new Map<string, number>()

  for (const puzzle of official) {
    const type = puzzle.puzzle_type
    if (!type || !wanted.has(type)) continue
    if (puzzle.is_official === false) continue
    const n = perType.get(type) ?? 0
    if (n >= 14) continue
    perType.set(type, n + 1)
    picked.push(puzzle)
    if (
      [...wanted].every((t) => (perType.get(t) ?? 0) >= 14)
    ) {
      break
    }
  }

  const items: FeedItem[] = []
  for (const puzzle of picked) {
    const dayAccepted =
      typeof puzzle.day_accepted === "number"
        ? puzzle.day_accepted
        : originalDayCount
    const calendarDate =
      originalDayCount > 0
        ? dateForDayAccepted(dayAccepted, originalDayCount, nextMidnight)
        : new Date().toISOString().slice(0, 10)
    const item = cinenerdleItemFromOfficial(puzzle, feedId, calendarDate)
    if (item) items.push(item)
  }

  items.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0
    return bTime - aTime
  })

  return { items, title: labelForMode(mode) }
}
