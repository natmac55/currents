export type FeedSource = {
  id: string
  url: string
  title?: string
}

export type FeedItem = {
  id: string
  feedId: string
  feedTitle: string
  feedUrl: string
  title: string
  link: string
  summary: string
  publishedAt: string | null
  publishedLabel: string
}

export type FeedFetchError = {
  feedId: string
  url: string
  message: string
}

export type FeedFetchResult = {
  items: FeedItem[]
  sources: Array<{
    id: string
    url: string
    title: string
    itemCount: number
  }>
  errors: FeedFetchError[]
}
