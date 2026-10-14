import { makeFeedId } from "@/lib/feed-id"
import type { FeedSource } from "@/lib/types"

export type FeedsExport = {
  version: 1
  exportedAt: string
  feeds: Array<{ url: string; title?: string }>
}

export function serializeFeedsExport(feeds: FeedSource[]): string {
  const payload: FeedsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    feeds: feeds.map((f) => ({
      url: f.url,
      ...(f.title ? { title: f.title } : {}),
    })),
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

function asUrlList(value: unknown): Array<{ url: string; title?: string }> {
  if (!Array.isArray(value)) return []
  const out: Array<{ url: string; title?: string }> = []
  for (const entry of value) {
    if (typeof entry === "string") {
      out.push({ url: entry })
      continue
    }
    if (entry && typeof entry === "object" && "url" in entry) {
      const url = (entry as { url?: unknown }).url
      const title = (entry as { title?: unknown }).title
      if (typeof url === "string" && url.trim()) {
        out.push({
          url: url.trim(),
          title: typeof title === "string" ? title : undefined,
        })
      }
    }
  }
  return out
}

/** Parse an export file (Currents v1, bare array of feeds, or array of URL strings). */
export function parseFeedsImport(raw: string): FeedSource[] {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error("Import file isn’t valid JSON")
  }

  let list: Array<{ url: string; title?: string }> = []
  if (Array.isArray(data)) {
    list = asUrlList(data)
  } else if (data && typeof data === "object" && "feeds" in data) {
    list = asUrlList((data as { feeds: unknown }).feeds)
  } else {
    throw new Error("Expected a Currents export or a JSON list of feed URLs")
  }

  if (list.length === 0) {
    throw new Error("No feeds found in that file")
  }

  const byId = new Map<string, FeedSource>()
  for (const entry of list) {
    let url: string
    try {
      const parsed = new URL(entry.url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue
      }
      url = parsed.toString()
    } catch {
      continue
    }
    const id = makeFeedId(url)
    if (byId.has(id)) continue
    byId.set(id, { id, url, title: entry.title })
  }

  const feeds = [...byId.values()]
  if (feeds.length === 0) {
    throw new Error("No valid http(s) feed URLs in that file")
  }
  return feeds
}

/** Merge imported feeds into the current list (existing URLs win titles). */
export function mergeFeeds(
  current: FeedSource[],
  incoming: FeedSource[]
): { feeds: FeedSource[]; added: number } {
  const byId = new Map<string, FeedSource>()
  for (const feed of current) {
    byId.set(feed.id || makeFeedId(feed.url), {
      id: feed.id || makeFeedId(feed.url),
      url: feed.url,
      title: feed.title,
    })
  }
  let added = 0
  for (const feed of incoming) {
    const id = feed.id || makeFeedId(feed.url)
    if (byId.has(id)) continue
    byId.set(id, { id, url: feed.url, title: feed.title })
    added += 1
  }
  return { feeds: [...byId.values()], added }
}
