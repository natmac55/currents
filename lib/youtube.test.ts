import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isYouTubeFeedItem, isYouTubeFeedUrl, isYouTubeShort } from "./youtube"

describe("isYouTubeShort", () => {
  it("detects shorts URLs", () => {
    assert.equal(
      isYouTubeShort("https://www.youtube.com/shorts/bWkfjeNLdRk"),
      true
    )
  })

  it("allows longform watch URLs", () => {
    assert.equal(
      isYouTubeShort("https://www.youtube.com/watch?v=ANvSpqgNK50"),
      false
    )
  })
})

describe("isYouTubeFeedUrl", () => {
  it("recognizes the official uploads feed", () => {
    assert.equal(
      isYouTubeFeedUrl(
        "https://www.youtube.com/feeds/videos.xml?channel_id=UC4PooiX37Pld1T8J5SYT-SQ"
      ),
      true
    )
  })

  it("detects YouTube feed items by feedUrl", () => {
    assert.equal(
      isYouTubeFeedItem({
        feedUrl:
          "https://www.youtube.com/feeds/videos.xml?channel_id=UC4PooiX37Pld1T8J5SYT-SQ",
      }),
      true
    )
    assert.equal(
      isYouTubeFeedItem({ feedUrl: "https://hnrss.org/frontpage" }),
      false
    )
  })
})
