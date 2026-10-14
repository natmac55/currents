import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isTwitchUrl,
  normalizeTwitchUrl,
  twitchLiveItem,
  twitchLoginFromUrl,
} from "./twitch"

describe("twitchLoginFromUrl", () => {
  it("reads channel logins from twitch.tv URLs", () => {
    assert.equal(
      twitchLoginFromUrl("https://www.twitch.tv/shroud"),
      "shroud"
    )
    assert.equal(
      twitchLoginFromUrl("https://twitch.tv/Shroud/videos"),
      "shroud"
    )
    assert.equal(twitchLoginFromUrl("https://m.twitch.tv/xqc"), "xqc")
  })

  it("rejects non-channel paths", () => {
    assert.equal(twitchLoginFromUrl("https://www.twitch.tv/directory"), null)
    assert.equal(twitchLoginFromUrl("https://www.twitch.tv/"), null)
    assert.equal(twitchLoginFromUrl("https://example.com/shroud"), null)
  })
})

describe("isTwitchUrl / normalize", () => {
  it("detects twitch hosts", () => {
    assert.equal(isTwitchUrl("https://www.twitch.tv/shroud"), true)
    assert.equal(isTwitchUrl("https://hnrss.org/frontpage"), false)
  })

  it("normalizes to a canonical channel URL", () => {
    assert.equal(normalizeTwitchUrl("Shroud"), "https://www.twitch.tv/shroud")
  })
})

describe("twitchLiveItem", () => {
  it("builds a LIVE headline without spoiling chat", () => {
    const item = twitchLiveItem({
      feedId: "f1",
      login: "shroud",
      displayName: "shroud",
      stream: {
        id: "123",
        title: "Ranked",
        viewersCount: 4200,
        createdAt: "2026-10-14T12:00:00Z",
        game: { displayName: "Valorant" },
      },
    })
    assert.match(item.title, /^LIVE — shroud:/)
    assert.equal(item.link, "https://www.twitch.tv/shroud")
    assert.match(item.summary, /Valorant/)
    assert.match(item.summary, /4\.2K watching/)
  })
})
