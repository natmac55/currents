import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  mergeFeeds,
  parseFeedsImport,
  serializeFeedsExport,
} from "./import-export"
import { makeFeedId } from "./feed-id"

describe("import/export feeds", () => {
  it("round-trips a Currents export", () => {
    const feeds = [
      {
        id: makeFeedId("https://hnrss.org/frontpage"),
        url: "https://hnrss.org/frontpage",
        title: "Hacker News",
      },
    ]
    const raw = serializeFeedsExport(feeds)
    const parsed = parseFeedsImport(raw)
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0]?.url, "https://hnrss.org/frontpage")
    assert.equal(parsed[0]?.title, "Hacker News")
  })

  it("accepts a bare URL array", () => {
    const parsed = parseFeedsImport(
      JSON.stringify(["https://www.twitch.tv/shroud"])
    )
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0]?.url, "https://www.twitch.tv/shroud")
  })

  it("merges without duplicating URLs", () => {
    const current = [
      {
        id: makeFeedId("https://hnrss.org/frontpage"),
        url: "https://hnrss.org/frontpage",
      },
    ]
    const incoming = parseFeedsImport(
      JSON.stringify({
        version: 1,
        feeds: [
          { url: "https://hnrss.org/frontpage", title: "HN" },
          { url: "https://www.twitch.tv/shroud", title: "shroud" },
        ],
      })
    )
    const { feeds, added } = mergeFeeds(current, incoming)
    assert.equal(added, 1)
    assert.equal(feeds.length, 2)
  })
})
