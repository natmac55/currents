import Parser from "rss-parser"
import {
  cinenerdleModeFromUrl,
  fetchCinenerdleItems,
  isCinenerdleUrl,
} from "@/lib/cinenerdle"
import {
  fetchConnectionsItems,
  isConnectionsUrl,
} from "@/lib/connections"
import {
  fetchDailyOrbsItems,
  isDailyOrbsUrl,
} from "@/lib/daily-orbs"
import { makeFeedId } from "@/lib/feed-id"
import { resolveFeedUrl } from "@/lib/resolve-feed-url"
import { stripHtml, truncate } from "@/lib/strip-html"
import {
  fetchTwitchLiveItems,
  isTwitchUrl,
  twitchLoginFromUrl,
} from "@/lib/twitch"
import type { FeedFetchResult, FeedItem, FeedSource } from "@/lib/types"
import { isYouTubeFeedUrl, isYouTubeShort } from "@/lib/youtube"

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

export async function fetchFeeds(sources: FeedSource[]): Promise<FeedFetchResult> {
  const items: FeedItem[] = []
  const resultSources: FeedFetchResult["sources"] = []
  const errors: FeedFetchResult["errors"] = []

  await Promise.all(
    sources.map(async (source) => {
      const id = source.id || makeFeedId(source.url)
      let feedUrl = source.url
      try {
        const resolved = await resolveFeedUrl(source.url)
        feedUrl = resolved.url

        if (isConnectionsUrl(feedUrl)) {
          const connectionItems = await fetchConnectionsItems(id)
          items.push(...connectionItems)
          resultSources.push({
            id,
            url: feedUrl,
            title: resolved.label || source.title || "NYT Connections",
            itemCount: connectionItems.length,
          })
          return
        }

        if (isCinenerdleUrl(feedUrl)) {
          const mode = cinenerdleModeFromUrl(feedUrl)
          const { items: cineItems, title } = await fetchCinenerdleItems(
            id,
            mode
          )
          items.push(...cineItems)
          resultSources.push({
            id,
            url: feedUrl,
            title: resolved.label || source.title || title,
            itemCount: cineItems.length,
          })
          return
        }

        if (isDailyOrbsUrl(feedUrl)) {
          const orbItems = await fetchDailyOrbsItems(id)
          items.push(...orbItems)
          resultSources.push({
            id,
            url: feedUrl,
            title: resolved.label || source.title || "Daily Orbs",
            itemCount: orbItems.length,
          })
          return
        }

        if (isTwitchUrl(feedUrl)) {
          const login = twitchLoginFromUrl(feedUrl)
          if (!login) {
            throw new Error("Not a Twitch channel URL")
          }
          const { items: liveItems, title } = await fetchTwitchLiveItems(
            id,
            login
          )
          items.push(...liveItems)
          resultSources.push({
            id,
            url: feedUrl,
            // Prefer Helix/GQL displayName over the login-based resolve label.
            title: title || source.title || resolved.label,
            itemCount: liveItems.length,
          })
          return
        }

        const feed = await parser.parseURL(feedUrl)
        const feedTitle =
          feed.title?.trim() || source.title || resolved.label || source.url
        const dropShorts = isYouTubeFeedUrl(feedUrl)
        // Pull a wider window when skipping Shorts so longform still fills the list.
        const candidates = feed.items.slice(0, dropShorts ? 50 : 25)
        let count = 0

        for (const entry of candidates) {
          if (count >= 25) break
          const title = entry.title?.trim()
          const link = entry.link?.trim() || entry.guid?.trim()
          if (!title || !link) continue
          if (dropShorts && isYouTubeShort(link)) continue

          const publishedAt = entry.isoDate ?? entry.pubDate ?? null
          const summary = truncate(
            stripHtml(entry.contentSnippet || entry.summary || entry.content || "")
          )

          items.push({
            id: `${id}:${entry.guid || link}`,
            feedId: id,
            feedTitle,
            feedUrl,
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
          url: feedUrl,
          title: feedTitle,
          itemCount: count,
        })
      } catch (error) {
        errors.push({
          feedId: id,
          url: feedUrl,
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
