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

Paste any public RSS or Atom URL (for example `https://example.com/feed.xml`) to add more.

## Scripts

| Command         | Purpose               |
| --------------- | --------------------- |
| `npm run dev`   | Dev server on `47291` |
| `npm run build` | Production build      |
| `npm run start` | Production server     |
| `npm test`      | Unit tests            |
| `npm run lint`  | ESLint                |
