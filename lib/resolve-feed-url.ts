/**
 * Turn common site URLs into fetchable feed URLs when we can.
 * YouTube channel pages → official Atom upload feed.
 * NYT Connections game page → synthetic daily-puzzle source.
 */

import {
  cinenerdleModeFromUrl,
  isCinenerdleUrl,
  normalizeCinenerdleUrl,
} from "@/lib/cinenerdle"
import {
  CONNECTIONS_PAGE_URL,
  isConnectionsUrl,
} from "@/lib/connections"
import {
  DAILY_ORBS_ORIGIN,
  isDailyOrbsUrl,
} from "@/lib/daily-orbs"
import {
  isTwitchUrl,
  normalizeTwitchUrl,
  twitchLoginFromUrl,
} from "@/lib/twitch"

const YT_FEED = "https://www.youtube.com/feeds/videos.xml"
const CHANNEL_ID = "UC[\\w-]{20,}"

export type ResolveResult = {
  url: string
  label?: string
}

function youtubeFeedFromChannelId(channelId: string): string {
  return `${YT_FEED}?channel_id=${encodeURIComponent(channelId)}`
}

/**
 * Prefer page identity markers. A naive first `"channelId"` match often
 * hits a linked/sister channel (e.g. Good Mythical More on the GMM page).
 */
export function extractChannelId(html: string): string | null {
  const patterns = [
    // Own channel on the page
    new RegExp(
      `<link\\s+rel=["']canonical["']\\s+href=["']https://www\\.youtube\\.com/channel/(${CHANNEL_ID})["']`,
      "i"
    ),
    new RegExp(
      `<meta\\s+itemprop=["']channelId["']\\s+content=["'](${CHANNEL_ID})["']`,
      "i"
    ),
    new RegExp(
      `"vanityChannelUrl"\\s*:\\s*"https?://www\\.youtube\\.com/@[^"]+"[\\s\\S]{0,200}?"(externalId|channelId)"\\s*:\\s*"(${CHANNEL_ID})"`,
      "i"
    ),
    // Narrow JSON identity fields (still before generic channelId)
    new RegExp(`"externalId"\\s*:\\s*"(${CHANNEL_ID})"`),
    new RegExp(`"channelId"\\s*:\\s*"(${CHANNEL_ID})"`),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (!match) continue
    // vanityChannelUrl pattern has id in group 2
    const id = match[2] && match[2].startsWith("UC") ? match[2] : match[1]
    if (id?.startsWith("UC")) return id
  }
  return null
}

async function resolveYouTubePage(pageUrl: string): Promise<ResolveResult> {
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CurrentsRSS/1.0; +https://localhost)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
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

  if (isConnectionsUrl(parsed.toString())) {
    return {
      url: CONNECTIONS_PAGE_URL,
      label: "NYT Connections",
    }
  }

  if (isCinenerdleUrl(parsed.toString())) {
    const mode = cinenerdleModeFromUrl(parsed.toString())
    return {
      url: normalizeCinenerdleUrl(mode),
      label:
        mode === "original"
          ? "CineNerdle Original"
          : mode === "reversal"
            ? "CineNerdle Reversal"
            : "CineNerdle",
    }
  }

  if (isDailyOrbsUrl(parsed.toString())) {
    return {
      url: `${DAILY_ORBS_ORIGIN}/`,
      label: "Daily Orbs",
    }
  }

  if (isTwitchUrl(parsed.toString())) {
    const login = twitchLoginFromUrl(parsed.toString())
    if (!login) {
      throw new Error(
        "Paste a Twitch channel URL like https://www.twitch.tv/shroud"
      )
    }
    return {
      url: normalizeTwitchUrl(login),
      label: `Twitch · ${login}`,
    }
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    // Already the official uploads feed
    if (
      parsed.pathname === "/feeds/videos.xml" &&
      parsed.searchParams.get("channel_id")
    ) {
      return { url: parsed.toString(), label: "YouTube uploads" }
    }

    const channelMatch = parsed.pathname.match(
      new RegExp(`^/channel/(${CHANNEL_ID})/?$`)
    )
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
      // Strip /videos, /featured, etc. so we hit the channel root
      const handleRoot = parsed.pathname.match(/^(\/@[^/]+)/)
      const page =
        parsed.pathname === "/watch"
          ? `https://www.youtube.com/watch?v=${parsed.searchParams.get("v") || ""}`
          : handleRoot
            ? `https://www.youtube.com${handleRoot[1]}`
            : `https://www.youtube.com${parsed.pathname}`
      return resolveYouTubePage(page)
    }
  }

  return { url: parsed.toString() }
}
