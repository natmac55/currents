"use client"

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_FEEDS } from "@/lib/defaults"
import {
  mergeFeeds,
  parseFeedsImport,
  serializeFeedsExport,
} from "@/lib/import-export"
import {
  loadSeenIds,
  markManySeen,
  markSeen,
  markUnseen,
  saveSeenIds,
} from "@/lib/seen"
import { loadFeeds, makeFeedId, saveFeeds } from "@/lib/storage"
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/time"
import { isTwitchFeedItem, isTwitchUrl } from "@/lib/twitch"
import type { FeedFetchResult, FeedItem, FeedSource } from "@/lib/types"
import { isYouTubeFeedItem, isYouTubeFeedUrl } from "@/lib/youtube"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "ready" | "error"
type ActiveView = string | "all" | "twitch" | "youtube"

type CollapseKey =
  | "navYoutube"
  | "navTwitch"
  | "riverTwitch"
  | "riverYoutube"
  | "riverOther"

const COLLAPSE_STORAGE_KEY = "currents.collapsed.v1"

type CollapseState = Record<CollapseKey, boolean>

const DEFAULT_COLLAPSE: CollapseState = {
  navYoutube: false,
  navTwitch: false,
  riverTwitch: false,
  riverYoutube: false,
  riverOther: false,
}

function loadCollapseState(): CollapseState {
  if (typeof window === "undefined") return DEFAULT_COLLAPSE
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
    if (!raw) return DEFAULT_COLLAPSE
    const parsed = JSON.parse(raw) as Partial<CollapseState>
    return { ...DEFAULT_COLLAPSE, ...parsed }
  } catch {
    return DEFAULT_COLLAPSE
  }
}

function StoryRow({
  item,
  seen,
  onToggleSeen,
  onOpen,
}: {
  item: FeedItem
  seen: boolean
  onToggleSeen: () => void
  onOpen: () => void
}) {
  const relative = formatRelativeTime(item.publishedAt)
  const absolute =
    item.publishedAt != null
      ? formatAbsoluteTime(item.publishedAt)
      : item.publishedLabel
  const stamp = relative ?? absolute

  return (
    <li
      className={cn(
        "group flex items-start gap-2 border-b border-[var(--line)] py-5 first:pt-4 last:border-b-0",
        seen && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={onToggleSeen}
        className={cn(
          "mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
          seen
            ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            : "text-[var(--ink-faint)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
        )}
        aria-label={seen ? "Mark as unseen" : "Mark as seen"}
        aria-pressed={seen}
        title={seen ? "Mark as unseen" : "Mark as seen"}
      >
        {seen ? <Check className="size-4" /> : <Circle className="size-4" />}
      </button>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs tracking-wide uppercase",
                seen ? "text-[var(--ink-faint)]" : "text-[var(--accent)]"
              )}
            >
              {item.feedTitle}
              {!seen ? (
                <span className="ml-2 inline-block size-1.5 rounded-full bg-[var(--accent)] align-middle" />
              ) : null}
            </p>
            <h3
              className={cn(
                "mt-1 font-display text-xl leading-snug transition-colors sm:text-[1.35rem]",
                seen
                  ? "text-[var(--ink-muted)] group-hover:text-[var(--ink)]"
                  : "text-[var(--ink)] group-hover:text-[var(--accent)]"
              )}
            >
              {item.title}
            </h3>
            {item.summary ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
                {item.summary}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            <time
              dateTime={item.publishedAt ?? undefined}
              title={absolute}
              className="text-right text-xs tabular-nums text-[var(--ink-faint)]"
            >
              <span className="block font-medium text-[var(--ink-muted)]">
                {stamp}
              </span>
              {relative ? (
                <span className="mt-0.5 block text-[0.7rem]">{absolute}</span>
              ) : null}
            </time>
            <ArrowUpRight className="size-4 text-[var(--ink-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
        </div>
      </a>
    </li>
  )
}

function CollapseToggle({
  open,
  label,
  onToggle,
  className,
}: {
  open: boolean
  label: string
  onToggle: () => void
  className?: string
}) {
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-[var(--ink-faint)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--ink)]",
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

function SectionHeader({
  title,
  open,
  onToggle,
  unseenCount,
  totalCount,
  onMarkSeen,
  onViewAll,
}: {
  title: string
  open: boolean
  onToggle: () => void
  unseenCount: number
  totalCount: number
  onMarkSeen?: () => void
  onViewAll?: () => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <CollapseToggle open={open} label={title} onToggle={onToggle} />
        <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
        {totalCount > 0 ? (
          <span
            className={cn(
              "ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs tabular-nums",
              unseenCount > 0
                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "text-[var(--ink-faint)]"
            )}
            title={`${unseenCount} unseen · ${totalCount - unseenCount} seen`}
          >
            {unseenCount > 0 ? (
              <span className="inline-block size-1.5 rounded-full bg-[var(--accent)]" />
            ) : (
              <Check className="size-3" />
            )}
            {formatSeenMeta(totalCount, unseenCount)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {onMarkSeen && unseenCount > 0 ? (
          <button
            type="button"
            onClick={onMarkSeen}
            className="text-xs font-medium tracking-wide text-[var(--ink-muted)] uppercase hover:text-[var(--accent)]"
          >
            Mark seen
          </button>
        ) : null}
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium tracking-wide text-[var(--accent)] uppercase hover:underline"
          >
            View all
          </button>
        ) : null}
      </div>
    </div>
  )
}

function countSeenUnseen(list: FeedItem[], seen: Set<string>) {
  let unseen = 0
  for (const item of list) {
    if (!seen.has(item.id)) unseen++
  }
  return { total: list.length, unseen, seen: list.length - unseen }
}

function formatSeenMeta(
  total: number,
  unseen: number,
  emptyLabel = "No items"
) {
  if (total === 0) return emptyLabel
  const seen = total - unseen
  if (unseen === 0) return `${seen} seen`
  if (seen === 0) return `${unseen} unseen`
  return `${unseen} unseen · ${seen} seen`
}

function FeedNavRow({
  feed,
  active,
  metaLabel,
  failed,
  onSelect,
  onRemove,
}: {
  feed: FeedSource
  active: boolean
  metaLabel: string
  failed: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-md border border-[var(--danger-line)] bg-[var(--danger-soft)] px-2 py-2">
        <p className="px-1 text-xs leading-snug text-[var(--danger)]">
          Remove{" "}
          <span className="font-medium">{feed.title || feed.url}</span>?
        </p>
        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 flex-1 border-[var(--danger-line)] bg-transparent text-[var(--danger)] hover:bg-[var(--danger)]/10"
            onClick={() => {
              setConfirming(false)
              onRemove()
            }}
          >
            Remove
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 flex-1 text-[var(--ink-muted)]"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 transition-colors",
        active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--panel)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-3 py-2 text-left"
      >
        <span
          className={cn(
            "block truncate text-sm",
            active ? "font-medium text-[var(--ink)]" : "text-[var(--ink-muted)]"
          )}
        >
          {feed.title || feed.url}
        </span>
        <span className="block truncate text-xs text-[var(--ink-faint)]">
          {failed ? "Failed to load" : metaLabel}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="opacity-60 group-hover:opacity-100"
        aria-label={`Remove ${feed.title || feed.url}`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

export function ReaderApp() {
  const [feeds, setFeeds] = useState<FeedSource[]>(DEFAULT_FEEDS)
  const [urlDraft, setUrlDraft] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [data, setData] = useState<FeedFetchResult | null>(null)
  const [activeFeedId, setActiveFeedId] = useState<ActiveView>("all")
  const [hydrated, setHydrated] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [lastRemoved, setLastRemoved] = useState<{
    feed: FeedSource
    index: number
  } | null>(null)
  const [collapsed, setCollapsed] = useState<CollapseState>(DEFAULT_COLLAPSE)
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set())
  const [hideSeen, setHideSeen] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function persistSeen(next: Set<string>) {
    setSeenIds(next)
    saveSeenIds(next)
  }

  function markItemSeen(id: string) {
    persistSeen(markSeen(seenIds, id))
  }

  function toggleItemSeen(id: string) {
    persistSeen(
      seenIds.has(id) ? markUnseen(seenIds, id) : markSeen(seenIds, id)
    )
  }

  function toggleCollapsed(key: CollapseKey) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore quota / private mode
      }
      return next
    })
  }

  function clearRestoreTimer() {
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current)
      restoreTimerRef.current = null
    }
  }

  function scheduleRestoreExpiry() {
    clearRestoreTimer()
    restoreTimerRef.current = setTimeout(() => {
      setLastRemoved(null)
      restoreTimerRef.current = null
    }, 12_000)
  }

  useEffect(() => {
    setFeeds(loadFeeds())
    setCollapsed(loadCollapseState())
    setSeenIds(loadSeenIds())
    setHydrated(true)
    return () => clearRestoreTimer()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void refresh(feeds)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once after hydration
  }, [hydrated])

  async function refresh(nextFeeds: FeedSource[]) {
    if (nextFeeds.length === 0) {
      setData({ items: [], sources: [], errors: [] })
      setStatus("ready")
      setFetchError(null)
      return null
    }

    setStatus("loading")
    setFetchError(null)
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeds: nextFeeds }),
      })
      const payload = (await res.json()) as FeedFetchResult & { error?: string }
      if (!res.ok) {
        throw new Error(payload.error || "Refresh failed")
      }
      setData(payload)
      setStatus("ready")
      return payload
    } catch (error) {
      setStatus("error")
      setFetchError(error instanceof Error ? error.message : "Refresh failed")
      return null
    }
  }

  function persist(next: FeedSource[]) {
    setFeeds(next)
    saveFeeds(next)
    startTransition(() => {
      void refresh(next)
    })
  }

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddError(null)
    setNotice(null)
    clearRestoreTimer()
    setLastRemoved(null)

    const formUrl = String(new FormData(event.currentTarget).get("url") || "")
    const url = (formUrl || urlDraft).trim()
    if (!url) {
      setAddError("Paste a feed, Twitch channel, YouTube, or site URL.")
      return
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Use an http(s) URL")
      }
    } catch {
      setAddError("That doesn’t look like a valid URL.")
      return
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const payload = (await res.json()) as {
        url?: string
        label?: string
        error?: string
      }
      if (!res.ok || !payload.url) {
        throw new Error(payload.error || "Could not resolve that URL")
      }
      const nextId = makeFeedId(payload.url)
      if (feeds.some((f) => f.url === payload.url || f.id === nextId)) {
        setAddError("That feed is already in your list.")
        setStatus("ready")
        return
      }
      const added: FeedSource = {
        id: nextId,
        url: payload.url,
        title: payload.label,
      }
      const next = [...feeds, added]
      setFeeds(next)
      saveFeeds(next)
      setUrlDraft("")
      setActiveFeedId(added.id)

      const result = await refresh(next)
      const meta = result?.sources.find((s) => s.id === added.id)
      const failed = result?.errors.find((e) => e.feedId === added.id)
      if (failed) {
        setNotice(`Added, but couldn’t load stories: ${failed.message}`)
      } else {
        setNotice(
          `Added ${meta?.title || added.title || "feed"} — showing its ${
            meta?.itemCount ?? 0
          } latest stories.`
        )
      }
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Could not add feed")
      setStatus("ready")
    }
  }

  function removeFeed(id: string) {
    const index = feeds.findIndex((f) => f.id === id)
    const feed = index >= 0 ? feeds[index] : null
    if (!feed) return
    const next = feeds.filter((f) => f.id !== id)
    if (activeFeedId === id) setActiveFeedId("all")
    setAddError(null)
    setNotice(null)
    setLastRemoved({ feed, index })
    scheduleRestoreExpiry()
    persist(next)
  }

  function restoreRemovedFeed() {
    if (!lastRemoved) return
    const { feed, index } = lastRemoved
    if (feeds.some((f) => f.id === feed.id || f.url === feed.url)) {
      clearRestoreTimer()
      setLastRemoved(null)
      setNotice("That feed is already back in your list.")
      return
    }
    const next = [...feeds]
    next.splice(Math.min(index, next.length), 0, feed)
    clearRestoreTimer()
    setLastRemoved(null)
    setAddError(null)
    setNotice(`Restored ${feed.title || feed.url}.`)
    setActiveFeedId(feed.id)
    persist(next)
  }

  function exportFeeds() {
    setAddError(null)
    const blob = new Blob([serializeFeedsExport(feeds)], {
      type: "application/json",
    })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = href
    a.download = `currents-feeds-${stamp}.json`
    a.click()
    URL.revokeObjectURL(href)
    setNotice(`Exported ${feeds.length} feeds.`)
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setAddError(null)
    setNotice(null)
    try {
      const text = await file.text()
      const incoming = parseFeedsImport(text)
      const { feeds: next, added } = mergeFeeds(feeds, incoming)
      if (added === 0) {
        setNotice("Import looked good — every feed was already in your list.")
        return
      }
      persist(next)
      setNotice(
        `Imported ${added} new feed${added === 1 ? "" : "s"} (${next.length} total).`
      )
    } catch (error) {
      setAddError(
        error instanceof Error ? error.message : "Could not import that file"
      )
    }
  }

  const allItems = data?.items ?? []
  const twitchFeeds = feeds.filter((f) => isTwitchUrl(f.url))
  const youtubeFeeds = feeds.filter((f) => isYouTubeFeedUrl(f.url))
  const otherFeeds = feeds.filter(
    (f) => !isTwitchUrl(f.url) && !isYouTubeFeedUrl(f.url)
  )
  const twitchLiveItems = allItems.filter(isTwitchFeedItem)
  const youtubeItems = allItems.filter(isYouTubeFeedItem)
  const otherItems = allItems.filter(
    (item) => !isTwitchFeedItem(item) && !isYouTubeFeedItem(item)
  )

  const items: FeedItem[] =
    activeFeedId === "all"
      ? allItems
      : activeFeedId === "twitch"
        ? twitchLiveItems
        : activeFeedId === "youtube"
          ? youtubeItems
          : allItems.filter((item) => item.feedId === activeFeedId)

  const loading = status === "loading" || isPending
  const liveCount = twitchLiveItems.length
  const youtubeCount = youtubeItems.length

  const showTwitchSection =
    activeFeedId === "all" &&
    twitchFeeds.length > 0 &&
    (twitchLiveItems.length > 0 || !loading)

  const showYouTubeSection =
    activeFeedId === "all" &&
    youtubeFeeds.length > 0 &&
    (youtubeItems.length > 0 || !loading)

  const riverItems =
    activeFeedId === "all"
      ? otherItems
      : activeFeedId === "twitch"
        ? twitchLiveItems
        : activeFeedId === "youtube"
          ? youtubeItems
          : items

  function visible(list: FeedItem[]): FeedItem[] {
    return hideSeen ? list.filter((item) => !seenIds.has(item.id)) : list
  }

  const visibleTwitch = visible(twitchLiveItems)
  const visibleYoutube = visible(youtubeItems)
  const visibleRiver = visible(riverItems)
  const viewCounts = countSeenUnseen(items, seenIds)
  const twitchCounts = countSeenUnseen(twitchLiveItems, seenIds)
  const youtubeCounts = countSeenUnseen(youtubeItems, seenIds)
  const otherCounts = countSeenUnseen(otherItems, seenIds)
  const allCounts = countSeenUnseen(allItems, seenIds)
  const unseenInView = viewCounts.unseen
  const twitchUnseen = twitchCounts.unseen
  const youtubeUnseen = youtubeCounts.unseen
  const otherUnseen = otherCounts.unseen

  function feedSeenMeta(feedId: string, emptyLabel = "No items") {
    const feedItems = allItems.filter((item) => item.feedId === feedId)
    const { total, unseen } = countSeenUnseen(feedItems, seenIds)
    return formatSeenMeta(total, unseen, emptyLabel)
  }

  function renderStories(list: FeedItem[]) {
    return list.map((item) => (
      <StoryRow
        key={item.id}
        item={item}
        seen={seenIds.has(item.id)}
        onToggleSeen={() => toggleItemSeen(item.id)}
        onOpen={() => markItemSeen(item.id)}
      />
    ))
  }

  function markVisibleSeen(list: FeedItem[]) {
    const ids = list.map((item) => item.id)
    if (ids.length === 0) return
    persistSeen(markManySeen(seenIds, ids))
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-8 lg:px-10">
      <header className="relative animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
              Currents
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
              Pull headlines from the sites you choose — one river, no algorithm.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => void onImportFile(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--line)] bg-[var(--panel)]/70 backdrop-blur"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--line)] bg-[var(--panel)]/70 backdrop-blur"
              onClick={exportFeeds}
              disabled={feeds.length === 0}
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--line)] bg-[var(--panel)]/70 backdrop-blur"
              onClick={() => void refresh(feeds)}
              disabled={loading || feeds.length === 0}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <form
          onSubmit={onAdd}
          className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <Input
              name="url"
              value={urlDraft}
              onValueChange={setUrlDraft}
              placeholder="https://www.twitch.tv/shroud or feed.xml"
              aria-label="Feed, Twitch, or YouTube URL"
              className="h-11 border-[var(--line)] bg-[var(--panel)] text-base shadow-sm"
            />
            {addError ? (
              <p className="mt-2 text-sm text-[var(--danger)]">{addError}</p>
            ) : lastRemoved ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ink-muted)]">
                <span>
                  Removed{" "}
                  <span className="font-medium text-[var(--ink)]">
                    {lastRemoved.feed.title || lastRemoved.feed.url}
                  </span>
                  .
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-[var(--line)] bg-[var(--panel)]"
                  onClick={restoreRemovedFeed}
                >
                  <Undo2 className="size-3.5" />
                  Restore
                </Button>
              </div>
            ) : notice ? (
              <p className="mt-2 text-sm text-[var(--accent)]">{notice}</p>
            ) : (
              <p className="mt-2 text-sm text-[var(--ink-faint)]">
                YouTube, Twitch (live), NYT Connections, CineNerdle, and Daily
                Orbs work. Import/export your list anytime.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 bg-[var(--accent)] px-5 text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            <Plus className="size-4" />
            Add feed
          </Button>
        </form>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="animate-fade-up-delay space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--ink-faint)] uppercase">
              Your feeds
            </h2>
            <span className="text-xs text-[var(--ink-faint)]">{feeds.length}</span>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActiveFeedId("all")}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm transition-colors",
                activeFeedId === "all"
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
              )}
            >
              <span className="block">All currents</span>
              <span className="block text-xs text-[var(--ink-faint)]">
                {data
                  ? formatSeenMeta(allCounts.total, allCounts.unseen)
                  : "—"}
              </span>
            </button>

            {otherFeeds.map((feed) => {
              const meta = data?.sources.find((s) => s.id === feed.id)
              const failed = Boolean(
                data?.errors.find((e) => e.feedId === feed.id)
              )
              return (
                <FeedNavRow
                  key={feed.id}
                  feed={{
                    ...feed,
                    title: meta?.title || feed.title || feed.url,
                  }}
                  active={activeFeedId === feed.id}
                  metaLabel={
                    data ? feedSeenMeta(feed.id) : `${meta?.itemCount ?? "—"} items`
                  }
                  failed={failed}
                  onSelect={() => setActiveFeedId(feed.id)}
                  onRemove={() => removeFeed(feed.id)}
                />
              )
            })}

            {youtubeFeeds.length > 0 && (
              <div className="pt-3">
                <div className="mb-1 flex items-center justify-between gap-1 px-1">
                  <p className="px-2 text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--ink-faint)] uppercase">
                    YouTube
                  </p>
                  <CollapseToggle
                    open={!collapsed.navYoutube}
                    label="YouTube feeds"
                    onToggle={() => toggleCollapsed("navYoutube")}
                  />
                </div>
                {!collapsed.navYoutube && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveFeedId("youtube")}
                      className={cn(
                        "mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        activeFeedId === "youtube"
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                          : "text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
                      )}
                    >
                      <span className="block">All uploads</span>
                      <span className="block text-xs text-[var(--ink-faint)]">
                        {formatSeenMeta(
                          youtubeCounts.total,
                          youtubeCounts.unseen,
                          "No videos"
                        )}
                      </span>
                    </button>
                    {youtubeFeeds.map((feed) => {
                      const meta = data?.sources.find((s) => s.id === feed.id)
                      const failed = Boolean(
                        data?.errors.find((e) => e.feedId === feed.id)
                      )
                      return (
                        <FeedNavRow
                          key={feed.id}
                          feed={{
                            ...feed,
                            title: meta?.title || feed.title || feed.url,
                          }}
                          active={activeFeedId === feed.id}
                          metaLabel={
                            data
                              ? feedSeenMeta(feed.id, "No videos")
                              : `${meta?.itemCount ?? "—"} items`
                          }
                          failed={failed}
                          onSelect={() => setActiveFeedId(feed.id)}
                          onRemove={() => removeFeed(feed.id)}
                        />
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {twitchFeeds.length > 0 && (
              <div className="pt-3">
                <div className="mb-1 flex items-center justify-between gap-1 px-1">
                  <p className="px-2 text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--ink-faint)] uppercase">
                    Twitch
                  </p>
                  <CollapseToggle
                    open={!collapsed.navTwitch}
                    label="Twitch feeds"
                    onToggle={() => toggleCollapsed("navTwitch")}
                  />
                </div>
                {!collapsed.navTwitch && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveFeedId("twitch")}
                      className={cn(
                        "mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        activeFeedId === "twitch"
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                          : "text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
                      )}
                    >
                      <span className="block">All live</span>
                      <span className="block text-xs text-[var(--ink-faint)]">
                        {liveCount === 0
                          ? "Nobody live"
                          : `${formatSeenMeta(
                              twitchCounts.total,
                              twitchCounts.unseen
                            )} · live`}
                      </span>
                    </button>
                    {twitchFeeds.map((feed) => {
                      const meta = data?.sources.find((s) => s.id === feed.id)
                      const failed = Boolean(
                        data?.errors.find((e) => e.feedId === feed.id)
                      )
                      const feedItems = allItems.filter(
                        (item) => item.feedId === feed.id
                      )
                      const counts = countSeenUnseen(feedItems, seenIds)
                      const liveMeta =
                        meta == null
                          ? "—"
                          : meta.itemCount === 0
                            ? "Offline"
                            : `${formatSeenMeta(counts.total, counts.unseen)} · live`
                      return (
                        <FeedNavRow
                          key={feed.id}
                          feed={{
                            ...feed,
                            title: meta?.title || feed.title || feed.url,
                          }}
                          active={activeFeedId === feed.id}
                          metaLabel={liveMeta}
                          failed={failed}
                          onSelect={() => setActiveFeedId(feed.id)}
                          onRemove={() => removeFeed(feed.id)}
                        />
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </nav>

          {feeds.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--line)] px-3 py-4 text-sm text-[var(--ink-muted)]">
              No feeds yet. Paste a URL above to start the river.
            </p>
          )}
        </aside>

        <section className="animate-fade-up-delay-2 min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {activeFeedId === "all"
                  ? "Latest across the net"
                  : activeFeedId === "twitch"
                    ? "Live on Twitch"
                    : activeFeedId === "youtube"
                      ? "From YouTube"
                      : "From this feed"}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {loading
                  ? "Fetching feeds…"
                  : activeFeedId === "twitch"
                    ? liveCount === 0
                      ? "Nobody you follow is live right now"
                      : `${liveCount} live`
                    : activeFeedId === "youtube"
                      ? youtubeCount === 0
                        ? "No recent uploads"
                        : `${youtubeCount} ${
                            youtubeCount === 1 ? "video" : "videos"
                          }`
                      : activeFeedId === "all"
                        ? [
                            `${otherItems.length} ${
                              otherItems.length === 1 ? "story" : "stories"
                            }`,
                            youtubeFeeds.length > 0
                              ? `${youtubeCount} on YouTube`
                              : null,
                            twitchFeeds.length > 0
                              ? `${liveCount} live on Twitch`
                              : null,
                            formatSeenMeta(viewCounts.total, viewCounts.unseen),
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : formatSeenMeta(
                            viewCounts.total,
                            viewCounts.unseen,
                            "No stories"
                          )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[var(--line)] bg-[var(--panel)]/70"
                onClick={() => setHideSeen((v) => !v)}
                aria-pressed={hideSeen}
              >
                {hideSeen ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
                {hideSeen ? "Show seen" : "Hide seen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[var(--line)] bg-[var(--panel)]/70"
                disabled={unseenInView === 0}
                onClick={() => markVisibleSeen(items)}
              >
                <Check className="size-3.5" />
                Mark all seen
              </Button>
            </div>
          </div>

          {data?.errors && data.errors.length > 0 && (
            <ul className="mb-4 space-y-2">
              {data.errors.map((err) => (
                <li
                  key={err.feedId}
                  className="flex items-start gap-2 rounded-md border border-[var(--danger-line)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  <X className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    <span className="font-medium">{err.url}</span>
                    {" — "}
                    {err.message}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {status === "error" && fetchError && (
            <div className="rounded-md border border-[var(--danger-line)] bg-[var(--danger-soft)] px-4 py-6 text-[var(--danger)]">
              <p className="font-medium">Couldn’t refresh feeds</p>
              <p className="mt-1 text-sm opacity-90">{fetchError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 border-[var(--danger-line)]"
                onClick={() => void refresh(feeds)}
              >
                Try again
              </Button>
            </div>
          )}

          {loading && !data && (
            <div className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)]/80 px-4 py-10 text-[var(--ink-muted)]">
              <LoaderCircle className="size-5 animate-spin" />
              Pulling stories from your feeds…
            </div>
          )}

          {!loading &&
            status !== "error" &&
            items.length === 0 &&
            feeds.length > 0 &&
            activeFeedId !== "twitch" &&
            activeFeedId !== "youtube" &&
            !(
              activeFeedId === "all" &&
              (twitchFeeds.length > 0 || youtubeFeeds.length > 0)
            ) && (
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)]/50 px-4 py-10 text-[var(--ink-muted)]">
                No stories returned. The feeds may be empty or temporarily
                unreachable.
              </div>
            )}

          {!loading && feeds.length === 0 && (
            <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)]/50 px-4 py-10 text-[var(--ink-muted)]">
              Add a feed URL to see headlines here.
            </div>
          )}

          {showTwitchSection && (
            <div className="mb-10">
              <SectionHeader
                title="Live on Twitch"
                open={!collapsed.riverTwitch}
                onToggle={() => toggleCollapsed("riverTwitch")}
                unseenCount={twitchUnseen}
                totalCount={twitchLiveItems.length}
                onMarkSeen={() => markVisibleSeen(twitchLiveItems)}
                onViewAll={() => setActiveFeedId("twitch")}
              />
              {!collapsed.riverTwitch &&
                (twitchLiveItems.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                    Nobody you follow is live right now.
                  </p>
                ) : visibleTwitch.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                    All live streams are marked seen.
                  </p>
                ) : (
                  <ul className="border-t border-[var(--line)]">
                    {renderStories(visibleTwitch)}
                  </ul>
                ))}
            </div>
          )}

          {showYouTubeSection && (
            <div className="mb-10">
              <SectionHeader
                title="From YouTube"
                open={!collapsed.riverYoutube}
                onToggle={() => toggleCollapsed("riverYoutube")}
                unseenCount={youtubeUnseen}
                totalCount={youtubeItems.length}
                onMarkSeen={() => markVisibleSeen(youtubeItems)}
                onViewAll={() => setActiveFeedId("youtube")}
              />
              {!collapsed.riverYoutube &&
                (youtubeItems.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                    No recent uploads from your channels.
                  </p>
                ) : visibleYoutube.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                    All YouTube uploads here are marked seen.
                  </p>
                ) : (
                  <ul className="border-t border-[var(--line)]">
                    {renderStories(visibleYoutube)}
                  </ul>
                ))}
            </div>
          )}

          {activeFeedId === "all" && otherItems.length > 0 && (
            <SectionHeader
              title="Everything else"
              open={!collapsed.riverOther}
              onToggle={() => toggleCollapsed("riverOther")}
              unseenCount={otherUnseen}
              totalCount={otherItems.length}
              onMarkSeen={() => markVisibleSeen(otherItems)}
            />
          )}

          {(activeFeedId !== "all" || otherItems.length > 0) &&
            activeFeedId !== "twitch" &&
            activeFeedId !== "youtube" &&
            !(activeFeedId === "all" && collapsed.riverOther) &&
            (visibleRiver.length > 0 ? (
              <ul className="border-t border-[var(--line)]">
                {renderStories(visibleRiver)}
              </ul>
            ) : riverItems.length > 0 && hideSeen ? (
              <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                Everything in this section is marked seen.
              </p>
            ) : null)}

          {activeFeedId === "twitch" && (
            <>
              {twitchLiveItems.length === 0 && !loading && (
                <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)]/50 px-4 py-10 text-[var(--ink-muted)]">
                  Nobody you follow is live right now. Refresh when they go
                  live.
                </div>
              )}
              {twitchLiveItems.length > 0 && visibleTwitch.length === 0 && (
                <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                  All live streams are marked seen.
                </p>
              )}
              {visibleTwitch.length > 0 && (
                <ul className="border-t border-[var(--line)]">
                  {renderStories(visibleTwitch)}
                </ul>
              )}
            </>
          )}

          {activeFeedId === "youtube" && (
            <>
              {youtubeItems.length === 0 && !loading && (
                <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)]/50 px-4 py-10 text-[var(--ink-muted)]">
                  No recent uploads from your channels.
                </div>
              )}
              {youtubeItems.length > 0 && visibleYoutube.length === 0 && (
                <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                  All YouTube uploads here are marked seen.
                </p>
              )}
              {visibleYoutube.length > 0 && (
                <ul className="border-t border-[var(--line)]">
                  {renderStories(visibleYoutube)}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
