import Parser from "rss-parser"
import { stripHtml, truncate } from "@/lib/strip-html"
import type { FeedFetchResult, FeedItem, FeedSource } from "@/lib/types"

const parser = new Parser({
  timeout: 12_000,
  headers: {
    "User-Agent": "CurrentsRSS/1.0 (+https://localhost; personal reader)",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
})

function formatPublished(iso: string | null): string {
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

function sourceId(url: string): string {
  return Buffer.from(url).toString("base64url").slice(0, 24)
}

export async function fetchFeeds(sources: FeedSource[]): Promise<FeedFetchResult> {
  const items: FeedItem[] = []
  const resultSources: FeedFetchResult["sources"] = []
  const errors: FeedFetchResult["errors"] = []

  await Promise.all(
    sources.map(async (source) => {
      const id = source.id || sourceId(source.url)
      try {
        const feed = await parser.parseURL(source.url)
        const feedTitle = feed.title?.trim() || source.title || source.url
        let count = 0

        for (const entry of feed.items.slice(0, 25)) {
          const title = entry.title?.trim()
          const link = entry.link?.trim() || entry.guid?.trim()
          if (!title || !link) continue

          const publishedAt = entry.isoDate ?? entry.pubDate ?? null
          const summary = truncate(
            stripHtml(entry.contentSnippet || entry.summary || entry.content || "")
          )

          items.push({
            id: `${id}:${entry.guid || link}`,
            feedId: id,
            feedTitle,
            feedUrl: source.url,
            title,
            link,
            summary,
            publishedAt,
            publishedLabel: formatPublished(publishedAt),
          })
          count += 1
        }

        resultSources.push({
          id,
          url: source.url,
          title: feedTitle,
          itemCount: count,
        })
      } catch (error) {
        errors.push({
          feedId: id,
          url: source.url,
          message:
            error instanceof Error ? error.message : "Could not fetch this feed",
        })
      }
    })
  )

  items.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0
    return bTime - aTime
  })

  resultSources.sort((a, b) => a.title.localeCompare(b.title))

  return { items, sources: resultSources, errors }
}
