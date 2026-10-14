import { fetchFeeds } from "@/lib/fetch-feeds"
import type { FeedSource } from "@/lib/types"

type Body = {
  feeds?: Array<{ id?: string; url?: string; title?: string }>
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const raw = Array.isArray(body.feeds) ? body.feeds : []
  const feeds: FeedSource[] = []
  const seen = new Set<string>()

  for (const entry of raw.slice(0, 20)) {
    const url = entry.url?.trim()
    if (!url || !isHttpUrl(url) || seen.has(url)) continue
    seen.add(url)
    feeds.push({
      id:
        entry.id?.trim() ||
        Buffer.from(url).toString("base64url").slice(0, 24),
      url,
      title: entry.title?.trim(),
    })
  }

  if (feeds.length === 0) {
    return Response.json(
      { error: "Provide at least one http(s) feed URL" },
      { status: 400 }
    )
  }

  const result = await fetchFeeds(feeds)
  return Response.json(result)
}
