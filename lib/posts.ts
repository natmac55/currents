export type Post = {
  title: string;
  slug: string;
  date: string; // ISO date YYYY-MM-DD
  summary: string;
  body: string[];
};

const posts: Post[] = [
  {
    title: "Prefer static content over client clocks",
    slug: "prefer-static-content",
    date: "2026-03-12",
    summary:
      "Dated notes and RSS items should come from a posts module, not Date.now in the render path.",
    body: [
      "When a page can be prerendered, baking wall-clock time into the tree is a footgun. Cache-aware frameworks will refuse sync Date.now and Math.random during prerender for good reason: the output would lie about freshness and break reproducibility.",
      "For a notes site, the fix is boring and correct. Keep titles, dates, summaries, and body copy in a typed module. Helpers like getAllPosts and getPostBySlug become the single source for the homepage, post pages, and the feed.",
      "Unknown slugs should call notFound() rather than inventing a fallback page. That keeps generateStaticParams honest and the RSS channel aligned with what readers can open in the browser.",
    ],
  },
  {
    title: "RSS is the contract your homepage already makes",
    slug: "rss-is-the-contract",
    date: "2026-02-28",
    summary:
      "If you publish dated notes, a feed is not a nice-to-have — it mirrors the same publishing surface in a machine-readable form.",
    body: [
      "Could we create an RSS feed? Yes. Should we? Yes, whenever there is a dated publishing surface. Readers, aggregators, and offline tools still speak RSS 2.0 fluently.",
      "The feed should not be a second editorial process. Channel items reuse the same title, link, guid, pubDate, and description that the site already shows. Escape XML carefully so ampersands and quotes in titles do not corrupt the document.",
      "Expose the feed at a stable path like /feed.xml, advertise it with metadata.alternates.types for application/rss+xml, and keep SITE_URL configurable so local and production links stay absolute.",
    ],
  },
  {
    title: "Ship the thin vertical slice first",
    slug: "thin-vertical-slice",
    date: "2026-01-18",
    summary:
      "A usable notes site needs content, a list, a detail route, and a feed — not auth, a database, or a CMS.",
    body: [
      "Empty repos tempt overbuilding. Auth, databases, and draft workflows can wait. The first slice that proves the product exists is a handful of real notes, a brand-led homepage, permalinks, and a feed that mirrors them.",
      "Static params for known slugs keep navigation fast. A shared posts module keeps the RSS builder and the UI from drifting apart. Tests on escapeXml and on feed contents catch the regressions that matter.",
      "Once that slice runs locally on a fixed port, you have something to subscribe to — which is the whole point of asking whether an RSS feed belongs here.",
    ],
  },
];

export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}
