"use client"

import { DEFAULT_FEEDS, STORAGE_KEY } from "@/lib/defaults"
import type { FeedSource } from "@/lib/types"

export function loadFeeds(): FeedSource[] {
  if (typeof window === "undefined") return DEFAULT_FEEDS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FEEDS
    const parsed = JSON.parse(raw) as FeedSource[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FEEDS
    return parsed.filter((f) => typeof f?.url === "string" && f.url.length > 0)
  } catch {
    return DEFAULT_FEEDS
  }
}

export function saveFeeds(feeds: FeedSource[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds))
}

export function makeFeedId(url: string): string {
  const bytes = new TextEncoder().encode(url)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 24)
}
