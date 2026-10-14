import type { FeedItem } from "@/lib/types"

export const DAILY_ORBS_ORIGIN = "https://dailyorbs.com"
const SITEMAP_URL = `${DAILY_ORBS_ORIGIN}/sitemap.xml`

export function isDailyOrbsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return host === "dailyorbs.com"
  } catch {
    return false
  }
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

/** Pull YYYY-MM-DD day pages from the Daily Orbs sitemap. */
export function parseDailyOrbsDates(sitemapXml: string): string[] {
  const dates = new Set<string>()
  const re =
    /<loc>\s*https:\/\/(?:www\.)?dailyorbs\.com\/(\d{4}-\d{2}-\d{2})\/?\s*<\/loc>/gi
  for (const match of sitemapXml.matchAll(re)) {
    dates.add(match[1])
  }
  return [...dates].sort((a, b) => b.localeCompare(a))
}

export function dailyOrbsItemFromDate(
  isoDate: string,
  feedId: string
): FeedItem {
  const label = formatLabel(isoDate)
  return {
    id: `daily-orbs:${isoDate}`,
    feedId,
    feedTitle: "Daily Orbs",
    feedUrl: DAILY_ORBS_ORIGIN + "/",
    title: `Daily Orbs — ${label}`,
    link: `${DAILY_ORBS_ORIGIN}/${isoDate}`,
    summary: "Four new Daily Orbs puzzles are up for this day.",
    publishedAt: `${isoDate}T12:00:00.000Z`,
    publishedLabel: label,
  }
}

export async function fetchDailyOrbsItems(
  feedId: string
): Promise<FeedItem[]> {
  const res = await fetch(SITEMAP_URL, {
    headers: {
      Accept: "application/xml,text/xml,*/*",
      "User-Agent":
        "Mozilla/5.0 (compatible; CurrentsRSS/1.0; personal reader)",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Daily Orbs sitemap failed (${res.status})`)
  }
  const xml = await res.text()
  const dates = parseDailyOrbsDates(xml).slice(0, 16)
  return dates.map((date) => dailyOrbsItemFromDate(date, feedId))
}
