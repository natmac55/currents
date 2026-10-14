import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  dailyOrbsItemFromDate,
  isDailyOrbsUrl,
  parseDailyOrbsDates,
} from "./daily-orbs"

describe("isDailyOrbsUrl", () => {
  it("detects dailyorbs.com", () => {
    assert.equal(isDailyOrbsUrl("https://dailyorbs.com/"), true)
    assert.equal(isDailyOrbsUrl("https://www.dailyorbs.com/2026-10-14"), true)
  })
})

describe("parseDailyOrbsDates", () => {
  it("extracts day URLs from a sitemap", () => {
    const xml = `
      <urlset>
        <url><loc>https://dailyorbs.com/</loc></url>
        <url><loc>https://dailyorbs.com/2026-10-13</loc></url>
        <url><loc>https://dailyorbs.com/dead-language</loc></url>
        <url><loc>https://dailyorbs.com/2026-10-14</loc></url>
      </urlset>
    `
    assert.deepEqual(parseDailyOrbsDates(xml), ["2026-10-14", "2026-10-13"])
  })
})

describe("dailyOrbsItemFromDate", () => {
  it("builds a spoiler-free day item", () => {
    const item = dailyOrbsItemFromDate("2026-10-14", "orbs")
    assert.equal(item.title, "Daily Orbs — Oct 14, 2026")
    assert.equal(item.link, "https://dailyorbs.com/2026-10-14")
  })
})
