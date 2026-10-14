# Field Notes

A small dated notes site with a real **RSS 2.0** feed. Same posts power the homepage, note pages, and `/feed.xml`.

## Why RSS?

Yes — when you have a dated publishing surface, you should expose a feed. Readers and aggregators still rely on RSS; mirroring titles, links, dates, and summaries keeps the site and the subscription surface in sync without a second editorial process.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:47291](http://127.0.0.1:47291).

- Site: `http://127.0.0.1:47291`
- Feed: `http://127.0.0.1:47291/feed.xml`

Optional: set `SITE_URL` (no trailing slash) so absolute links in the feed and metadata match your deploy host. Default is `http://127.0.0.1:47291`.

## Scripts

| Command         | Purpose                                   |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Next.js on port **47291**, host `0.0.0.0` |
| `npm run build` | Production build                          |
| `npm start`     | Serve production build on **47291**       |
| `npm test`      | RSS escape + feed content tests (`tsx`)   |
| `npm run lint`  | ESLint                                    |

## Content

Posts live in `lib/posts.ts`. Helpers `getAllPosts` and `getPostBySlug` feed the UI and `lib/rss.ts`. Add a note there and it appears on the site and in the feed.
