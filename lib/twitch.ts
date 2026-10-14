import type { FeedItem } from "@/lib/types"

/** Public Client-ID used by twitch.tv itself — enough for live status lookups. */
const TWITCH_GQL = "https://gql.twitch.tv/gql"
const TWITCH_WEB_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

export const TWITCH_ORIGIN = "https://www.twitch.tv"

const LOGIN_RE = /^[a-zA-Z0-9_]{1,25}$/

export function isTwitchUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase()
    return host === "twitch.tv" || host === "m.twitch.tv"
  } catch {
    return false
  }
}

export function isTwitchFeedItem(item: Pick<FeedItem, "feedUrl" | "id">): boolean {
  return item.id.startsWith("twitch:live:") || isTwitchUrl(item.feedUrl)
}

/** Extract channel login from a Twitch URL, or null if not a channel page. */
export function twitchLoginFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host !== "twitch.tv" && host !== "m.twitch.tv") return null

    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length === 0) return null
    const login = parts[0]?.toLowerCase()
    if (!login || !LOGIN_RE.test(login)) return null

    // Skip non-channel roots
    const reserved = new Set([
      "directory",
      "downloads",
      "jobs",
      "p",
      "settings",
      "subscriptions",
      "turbo",
      "search",
      "videos",
      "u",
    ])
    if (reserved.has(login)) return null
    return login
  } catch {
    return null
  }
}

export function normalizeTwitchUrl(login: string): string {
  return `${TWITCH_ORIGIN}/${login.toLowerCase()}`
}

type GqlUser = {
  id?: string
  login?: string
  displayName?: string
  stream?: {
    id?: string
    title?: string
    type?: string
    viewersCount?: number
    createdAt?: string
    game?: { name?: string; displayName?: string } | null
  } | null
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function formatLiveLabel(iso: string | null): string {
  if (!iso) return "Live now"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Live now"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function twitchLiveItem(opts: {
  feedId: string
  login: string
  displayName: string
  stream: NonNullable<GqlUser["stream"]>
}): FeedItem {
  const { feedId, login, displayName, stream } = opts
  const feedUrl = normalizeTwitchUrl(login)
  const game =
    stream.game?.displayName?.trim() || stream.game?.name?.trim() || null
  const viewers =
    typeof stream.viewersCount === "number" ? stream.viewersCount : null
  const titleText = stream.title?.trim() || "Live on Twitch"
  const parts: string[] = ["Live now"]
  if (game) parts.push(game)
  if (viewers != null) parts.push(`${formatViewers(viewers)} watching`)

  return {
    id: `twitch:live:${login}:${stream.id || stream.createdAt || "now"}`,
    feedId,
    feedTitle: `Twitch · ${displayName}`,
    feedUrl,
    title: `LIVE — ${displayName}: ${titleText}`,
    link: feedUrl,
    summary: parts.join(" · "),
    publishedAt: stream.createdAt ?? new Date().toISOString(),
    publishedLabel: formatLiveLabel(stream.createdAt ?? null),
  }
}

export async function fetchTwitchLiveItems(
  feedId: string,
  login: string
): Promise<{ items: FeedItem[]; title: string; live: boolean }> {
  const res = await fetch(TWITCH_GQL, {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_WEB_CLIENT_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; CurrentsRSS/1.0; personal reader)",
    },
    body: JSON.stringify({
      query: `query($login:String!){
        user(login:$login){
          id login displayName
          stream{ id title type viewersCount createdAt game{ name displayName } }
        }
      }`,
      variables: { login: login.toLowerCase() },
    }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Twitch live check failed (${res.status})`)
  }

  const payload = (await res.json()) as {
    data?: { user?: GqlUser | null }
    errors?: Array<{ message?: string }>
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Twitch query failed")
  }

  const user = payload.data?.user
  if (!user?.login) {
    throw new Error(`Twitch channel “${login}” not found`)
  }

  const displayName = user.displayName?.trim() || user.login
  const title = `Twitch · ${displayName}`
  const stream = user.stream
  if (!stream || (stream.type && stream.type !== "live")) {
    return { items: [], title, live: false }
  }

  return {
    items: [
      twitchLiveItem({
        feedId,
        login: user.login,
        displayName,
        stream,
      }),
    ],
    title,
    live: true,
  }
}
