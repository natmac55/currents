import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveFeedUrl } from "./resolve-feed-url"

describe("resolveFeedUrl", () => {
  it("passes through a normal feed URL", async () => {
    const out = await resolveFeedUrl("https://hnrss.org/frontpage")
    assert.equal(out.url, "https://hnrss.org/frontpage")
  })

  it("converts /channel/UC… to the YouTube Atom feed", async () => {
    const out = await resolveFeedUrl(
      "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"
    )
    assert.equal(
      out.url,
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"
    )
    assert.equal(out.label, "YouTube uploads")
  })

  it("accepts the official YouTube videos.xml feed", async () => {
    const feed =
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"
    const out = await resolveFeedUrl(feed)
    assert.equal(out.url, feed)
  })

  it("resolves a @handle page to the uploads feed", async () => {
    const out = await resolveFeedUrl("https://www.youtube.com/@GoogleDevelopers")
    assert.match(out.url, /feeds\/videos\.xml\?channel_id=UC/)
  })
})
