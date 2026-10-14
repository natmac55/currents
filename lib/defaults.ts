import type { FeedSource } from "@/lib/types"

/** Starter subscriptions — real public feeds that work without auth. */
export const DEFAULT_FEEDS: FeedSource[] = [
  {
    id: "hn",
    url: "https://hnrss.org/frontpage",
    title: "Hacker News",
  },
  {
    id: "bbc-tech",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    title: "BBC Technology",
  },
  {
    id: "nasa",
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    title: "NASA Breaking News",
  },
]

export const STORAGE_KEY = "currents.feeds.v1"
