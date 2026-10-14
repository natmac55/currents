import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cinenerdleItemFromOfficial,
  cinenerdleModeFromUrl,
  isCinenerdleUrl,
  normalizeCinenerdleFeedUrl,
} from "./cinenerdle"

describe("isCinenerdleUrl", () => {
  it("detects cinenerdle hosts", () => {
    assert.equal(
      isCinenerdleUrl("https://www.cinenerdle.app/puzzles/original/1442"),
      true
    )
  })
})

describe("cinenerdleModeFromUrl", () => {
  it("detects original vs reversal vs both", () => {
    assert.equal(
      cinenerdleModeFromUrl(
        "https://www.cinenerdle.app/puzzles/original/1442"
      ),
      "original"
    )
    assert.equal(
      cinenerdleModeFromUrl(
        "https://www.cinenerdle.app/puzzles/reversal/R1245"
      ),
      "reversal"
    )
    assert.equal(cinenerdleModeFromUrl("https://www.cinenerdle.app/"), "both")
  })
})

describe("normalizeCinenerdleFeedUrl", () => {
  it("points subscriptions at the combined feed root", () => {
    assert.equal(normalizeCinenerdleFeedUrl(), "https://www.cinenerdle.app/")
  })
})

describe("cinenerdleItemFromOfficial", () => {
  it("builds a spoiler-free original item", () => {
    const item = cinenerdleItemFromOfficial(
      {
        daycount: "1442",
        puzzle_type: "original",
        day_accepted: 1442,
        is_official: true,
      },
      "cine",
      "2026-10-14"
    )
    assert.ok(item)
    assert.equal(item.title, "CineNerdle Original 1442 — Oct 14, 2026")
    assert.equal(
      item.link,
      "https://www.cinenerdle.app/puzzles/original/1442"
    )
    assert.equal(JSON.stringify(item).includes("puzzle_data"), false)
  })
})
