import { getAllPosts, type Post } from "./posts";

export const DEFAULT_SITE_URL = "http://127.0.0.1:47291";

export function getSiteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_SITE_URL;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toRfc822(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  return date.toUTCString();
}

function itemXml(post: Post, siteUrl: string): string {
  const link = `${siteUrl}/notes/${post.slug}`;
  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(post.date)}</pubDate>
      <description>${escapeXml(post.summary)}</description>
    </item>`;
}

export function buildRssFeed(siteUrl: string = getSiteUrl()): string {
  const posts = getAllPosts();
  const items = posts.map((post) => itemXml(post, siteUrl)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml("Field Notes")}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(
      "Short engineering notes on shipping small, dated surfaces — including the feed itself.",
    )}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
}
