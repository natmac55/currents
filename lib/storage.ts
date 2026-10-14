"use client"

import {
  isCinenerdleUrl,
  normalizeCinenerdleFeedUrl,
} from "@/lib/cinenerdle"
import { DEFAULT_FEEDS, STORAGE_KEY } from "@/lib/defaults"
import { makeFeedId } from "@/lib/feed-id"
import type { FeedSource } from "@/lib/types"

export { makeFeedId }

/** Recompute ids from URLs and drop duplicates (same normalized id). */
export function migrateFeedIds(feeds: FeedSource[]): FeedSource[] {
  const byId = new Map<string, FeedSource>()
  for (const feed of feeds) {
    if (typeof feed?.url !== "string" || feed.url.length === 0) continue
    // Collapse Original/Reversal/home into one combined Cinenerdle feed.
    const url = isCinenerdleUrl(feed.url)
      ? normalizeCinenerdleFeedUrl()
      : feed.url
    const id = makeFeedId(url)
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      url,
      title: isCinenerdleUrl(url) ? "CineNerdle" : feed.title,
    })
  }
  return [...byId.values()]
}

export function loadFeeds(): FeedSource[] {
  if (typeof window === "undefined") return DEFAULT_FEEDS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FEEDS
    const parsed = JSON.parse(raw) as FeedSource[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FEEDS
    const migrated = migrateFeedIds(parsed)
    if (migrated.length === 0) return DEFAULT_FEEDS
    // Persist corrected ids when truncated base64 (or other) ids drifted.
    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
      saveFeeds(migrated)
    }
    return migrated
  } catch {
    return DEFAULT_FEEDS
  }
}

export function saveFeeds(feeds: FeedSource[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds))
}
