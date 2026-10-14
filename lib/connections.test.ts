import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CONNECTIONS_PAGE_URL,
  connectionsItemFromPuzzle,
  connectionsTodayNy,
  isConnectionsUrl,
} from "./connections"

describe("isConnectionsUrl", () => {
  it("accepts the NYT Connections game page", () => {
    assert.equal(isConnectionsUrl(CONNECTIONS_PAGE_URL), true)
    assert.equal(
      isConnectionsUrl("https://www.nytimes.com/games/connections/"),
      true
    )
  })

  it("rejects other NYT pages", () => {
    assert.equal(isConnectionsUrl("https://www.nytimes.com/"), false)
    assert.equal(
      isConnectionsUrl("https://www.nytimes.com/games/wordle"),
      false
    )
  })
})

describe("connectionsTodayNy", () => {
  it("formats a New York calendar date", () => {
    // 2026-10-15 02:00 UTC is still Oct 14 in America/New_York (EDT).
    assert.equal(
      connectionsTodayNy(new Date("2026-10-15T02:00:00.000Z")),
      "2026-10-14"
    )
  })
})

describe("connectionsItemFromPuzzle", () => {
  it("builds a spoiler-free item", () => {
    const item = connectionsItemFromPuzzle(
      {
        id: 1330,
        print_date: "2026-10-14",
        editor: "Wyna Liu",
        status: "OK",
      },
      "conn"
    )
    assert.ok(item)
    assert.equal(item.title, "Connections #1330 — Oct 14, 2026")
    assert.equal(item.link, CONNECTIONS_PAGE_URL)
    assert.match(item.summary, /Wyna Liu/)
    assert.equal(item.summary.toLowerCase().includes("categor"), false)
  })

  it("skips non-OK puzzles", () => {
    assert.equal(
      connectionsItemFromPuzzle(
        { print_date: "2026-10-14", status: "ERROR" },
        "conn"
      ),
      null
    )
  })
})
