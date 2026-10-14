import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extractChannelId, resolveFeedUrl } from "./resolve-feed-url"

describe("extractChannelId", () => {
  it("prefers the canonical channel over a sister channelId in the page", () => {
    const html = `
      <a href="/channel/UCzpCc5n9hqiVC7HhPwcIKEg">Good Mythical MORE</a>
      "channelId":"UCzpCc5n9hqiVC7HhPwcIKEg"
      <link rel="canonical" href="https://www.youtube.com/channel/UC4PooiX37Pld1T8J5SYT-SQ">
      "channelId":"UC4PooiX37Pld1T8J5SYT-SQ"
    `
    assert.equal(extractChannelId(html), "UC4PooiX37Pld1T8J5SYT-SQ")
  })
})

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

  it("resolves @goodmythicalmorning to Good Mythical Morning, not More", async () => {
    const out = await resolveFeedUrl(
      "https://www.youtube.com/@goodmythicalmorning"
    )
    assert.equal(
      out.url,
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC4PooiX37Pld1T8J5SYT-SQ"
    )
  })

  it("normalizes Twitch channel URLs", async () => {
    const out = await resolveFeedUrl("https://www.twitch.tv/Shroud/videos")
    assert.equal(out.url, "https://www.twitch.tv/shroud")
    assert.equal(out.label, "Twitch · shroud")
  })
})
