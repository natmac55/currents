"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import {
  ArrowUpRight,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_FEEDS } from "@/lib/defaults"
import { loadFeeds, makeFeedId, saveFeeds } from "@/lib/storage"
import type { FeedFetchResult, FeedItem, FeedSource } from "@/lib/types"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "ready" | "error"

export function ReaderApp() {
  const [feeds, setFeeds] = useState<FeedSource[]>(DEFAULT_FEEDS)
  const [urlDraft, setUrlDraft] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [data, setData] = useState<FeedFetchResult | null>(null)
  const [activeFeedId, setActiveFeedId] = useState<string | "all">("all")
  const [hydrated, setHydrated] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setFeeds(loadFeeds())
    setHydrated(true)
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

    const formUrl = String(new FormData(event.currentTarget).get("url") || "")
    const url = (formUrl || urlDraft).trim()
    if (!url) {
      setAddError("Paste a feed, YouTube channel, or site URL.")
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
    const next = feeds.filter((f) => f.id !== id)
    if (activeFeedId === id) setActiveFeedId("all")
    persist(next)
  }

  const items: FeedItem[] =
    activeFeedId === "all"
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((item) => item.feedId === activeFeedId)

  const loading = status === "loading" || isPending

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-[var(--line)] bg-[var(--panel)]/70 backdrop-blur"
            onClick={() => void refresh(feeds)}
            disabled={loading || feeds.length === 0}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
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
              placeholder="https://www.youtube.com/@channel or feed.xml"
              aria-label="Feed or YouTube URL"
              className="h-11 border-[var(--line)] bg-[var(--panel)] text-base shadow-sm"
            />
            {addError ? (
              <p className="mt-2 text-sm text-[var(--danger)]">{addError}</p>
            ) : notice ? (
              <p className="mt-2 text-sm text-[var(--accent)]">{notice}</p>
            ) : (
              <p className="mt-2 text-sm text-[var(--ink-faint)]">
                YouTube, NYT Connections, CineNerdle, and Daily Orbs work. Paste
                a channel, @handle, or a game URL.
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
              All currents
            </button>
            {feeds.map((feed) => {
              const meta = data?.sources.find((s) => s.id === feed.id)
              const failed = data?.errors.find((e) => e.feedId === feed.id)
              return (
                <div
                  key={feed.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md pr-1 transition-colors",
                    activeFeedId === feed.id
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--panel)]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFeedId(feed.id)}
                    className="min-w-0 flex-1 px-3 py-2 text-left"
                  >
                    <span
                      className={cn(
                        "block truncate text-sm",
                        activeFeedId === feed.id
                          ? "font-medium text-[var(--ink)]"
                          : "text-[var(--ink-muted)]"
                      )}
                    >
                      {meta?.title || feed.title || feed.url}
                    </span>
                    <span className="block truncate text-xs text-[var(--ink-faint)]">
                      {failed
                        ? "Failed to load"
                        : `${meta?.itemCount ?? "—"} items`}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-60 group-hover:opacity-100"
                    aria-label={`Remove ${feed.title || feed.url}`}
                    onClick={() => removeFeed(feed.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </nav>

          {feeds.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--line)] px-3 py-4 text-sm text-[var(--ink-muted)]">
              No feeds yet. Paste a URL above to start the river.
            </p>
          )}
        </aside>

        <section className="animate-fade-up-delay-2 min-w-0">
          <div className="mb-4">
            <h2 className="font-display text-2xl text-[var(--ink)]">
              {activeFeedId === "all"
                ? "Latest across the net"
                : "From this feed"}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {loading
                ? "Fetching feeds…"
                : `${items.length} ${items.length === 1 ? "story" : "stories"}`}
            </p>
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
            feeds.length > 0 && (
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

          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {items.map((item) => (
              <li key={item.id} className="group py-5 first:pt-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tracking-wide text-[var(--accent)] uppercase">
                        {item.feedTitle}
                        <span className="text-[var(--ink-faint)]">
                          {" "}
                          · {item.publishedLabel}
                        </span>
                      </p>
                      <h3 className="mt-1 font-display text-xl leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--accent)] sm:text-[1.35rem]">
                        {item.title}
                      </h3>
                      {item.summary ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
                          {item.summary}
                        </p>
                      ) : null}
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--ink-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
