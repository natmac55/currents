import { buildRssFeed } from "@/lib/rss";

export function GET() {
  const body = buildRssFeed();
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
