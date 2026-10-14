# Currents

A personal **RSS reader** — subscribe to public feeds from sites you care about, and read their latest stories in one timeline.

This is the “pull content from the net” kind of RSS, not a site that *publishes* a feed.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:47291](http://127.0.0.1:47291).

## How it works

- Feed URLs are stored in your browser (`localStorage`).
- The Next.js API route `POST /api/feeds` fetches and parses those feeds server-side (avoids CORS).
- Stories are merged and sorted by publish time.
- Starter feeds: Hacker News, BBC Technology, NASA Breaking News.
- **Import / Export** — download your feed list as JSON, or merge a previously exported file back in.

Paste any public RSS or Atom URL (for example `https://example.com/feed.xml`) to add more.

### YouTube

Yes — new uploads show up in RSS. Paste a channel URL or `@handle`, e.g. `https://www.youtube.com/@GoogleDevelopers`. Currents resolves it to YouTube’s official Atom feed (`/feeds/videos.xml?channel_id=…`). **Shorts are filtered out**; only longform (`/watch`) videos appear.

YouTube channels are grouped in the sidebar under **YouTube**, with an **All uploads** view and a **From YouTube** section in All currents (same idea as Twitch).

### Twitch

Paste a channel URL like `https://www.twitch.tv/shroud`. When that streamer is **live**, Currents shows a single LIVE item (title, game, viewer count). When they’re offline, the feed stays in your list with an Offline status and no river item. Refresh to re-check.

Twitch channels are grouped in the sidebar under **Twitch**, with an **All live** view and a **Live on Twitch** section at the top of All currents.

### Daily games

Most daily puzzles don’t publish RSS. Currents has built-in support for:

- **NYT Connections** — `https://www.nytimes.com/games/connections`
- **CineNerdle** — paste any puzzle or site URL (Original or Reversal); one feed covers both daily types
- **Daily Orbs** — `https://dailyorbs.com/`

Items are spoiler-free (title + link). Hit Refresh for the newest day.

## Scripts

| Command         | Purpose               |
| --------------- | --------------------- |
| `npm run dev`   | Dev server on `47291` |
| `npm run build` | Production build      |
| `npm run start` | Production server     |
| `npm test`      | Unit tests            |
| `npm run lint`  | ESLint                |
