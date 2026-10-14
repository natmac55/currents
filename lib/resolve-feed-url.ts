/**
 * Turn common site URLs into fetchable feed URLs when we can.
 * YouTube channel pages → official Atom upload feed.
 */

const YT_FEED = "https://www.youtube.com/feeds/videos.xml"

export type ResolveResult = {
  url: string
  label?: string
}

function youtubeFeedFromChannelId(channelId: string): string {
  return `${YT_FEED}?channel_id=${encodeURIComponent(channelId)}`
}

function extractChannelId(html: string): string | null {
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /channel_id=(UC[\w-]{20,})/,
    /\/channel\/(UC[\w-]{20,})/,
    /<meta\s+itemprop="channelId"\s+content="(UC[\w-]{20,})"/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

async function resolveYouTubePage(pageUrl: string): Promise<ResolveResult> {
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "CurrentsRSS/1.0 (+https://localhost; personal reader)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    throw new Error(`Could not open YouTube page (${res.status})`)
  }
  const html = await res.text()
  const channelId = extractChannelId(html)
  if (!channelId) {
    throw new Error(
      "Couldn’t find a channel id on that YouTube page. Paste the channel_id feed URL instead."
    )
  }
  return {
    url: youtubeFeedFromChannelId(channelId),
    label: "YouTube uploads",
  }
}

/** Normalize user-pasted URLs (YouTube channel pages, etc.) into feed URLs. */
export async function resolveFeedUrl(raw: string): Promise<ResolveResult> {
  const trimmed = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error("That doesn’t look like a valid URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Use an http(s) URL")
  }

  const host = parsed.hostname.replace(/^www\./, "")

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    // Already the official uploads feed
    if (parsed.pathname === "/feeds/videos.xml" && parsed.searchParams.get("channel_id")) {
      return { url: parsed.toString(), label: "YouTube uploads" }
    }

    const channelMatch = parsed.pathname.match(/^\/channel\/(UC[\w-]{20,})\/?$/)
    if (channelMatch) {
      return {
        url: youtubeFeedFromChannelId(channelMatch[1]),
        label: "YouTube uploads",
      }
    }

    // @handle, /c/, /user/, or a video page — resolve via HTML
    if (
      parsed.pathname.startsWith("/@") ||
      parsed.pathname.startsWith("/c/") ||
      parsed.pathname.startsWith("/user/") ||
      parsed.pathname.startsWith("/channel/") ||
      parsed.pathname === "/watch"
    ) {
      const page =
        parsed.pathname === "/watch"
          ? `https://www.youtube.com/watch?v=${parsed.searchParams.get("v") || ""}`
          : `https://www.youtube.com${parsed.pathname}`
      return resolveYouTubePage(page)
    }
  }

  return { url: parsed.toString() }
}
