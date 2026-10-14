import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllPosts } from "./posts";
import { buildRssFeed, escapeXml, getSiteUrl, DEFAULT_SITE_URL } from "./rss";

describe("escapeXml", () => {
  it("escapes ampersands, angles, and quotes", () => {
    assert.equal(
      escapeXml(`A & B <C> "D" 'E'`),
      "A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;",
    );
  });

  it("leaves plain text unchanged", () => {
    assert.equal(escapeXml("Field Notes"), "Field Notes");
  });
});

describe("buildRssFeed", () => {
  it("includes channel metadata and every post title and link", () => {
    const siteUrl = "http://example.test";
    const xml = buildRssFeed(siteUrl);

    assert.match(xml, /<rss version="2\.0">/);
    assert.match(xml, /<title>Field Notes<\/title>/);
    assert.match(xml, new RegExp(`<link>${siteUrl}</link>`));

    for (const post of getAllPosts()) {
      assert.ok(xml.includes(`<title>${escapeXml(post.title)}</title>`));
      assert.ok(xml.includes(`${siteUrl}/notes/${post.slug}`));
      assert.ok(xml.includes(`<description>${escapeXml(post.summary)}</description>`));
    }
  });

  it("escapes special characters via escapeXml helper", () => {
    assert.equal(escapeXml("Tom & Jerry"), "Tom &amp; Jerry");
    const xml = buildRssFeed("http://example.test");
    assert.match(xml, /<\/channel>/);
  });
});

describe("getSiteUrl", () => {
  it("falls back to the local default when SITE_URL is unset", () => {
    const previous = process.env.SITE_URL;
    delete process.env.SITE_URL;
    try {
      assert.equal(getSiteUrl(), DEFAULT_SITE_URL);
    } finally {
      if (previous === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = previous;
      }
    }
  });
});
