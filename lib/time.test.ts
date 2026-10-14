import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatAbsoluteTime, formatRelativeTime } from "./time"

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-10-14T20:00:00.000Z")

  it("returns just now / minutes / hours / days", () => {
    assert.equal(
      formatRelativeTime("2026-10-14T19:59:30.000Z", now),
      "just now"
    )
    assert.equal(
      formatRelativeTime("2026-10-14T19:40:00.000Z", now),
      "20m ago"
    )
    assert.equal(
      formatRelativeTime("2026-10-14T17:00:00.000Z", now),
      "3h ago"
    )
    assert.equal(
      formatRelativeTime("2026-10-12T20:00:00.000Z", now),
      "2d ago"
    )
  })

  it("returns null for older dates so absolute can take over", () => {
    assert.equal(
      formatRelativeTime("2026-08-01T20:00:00.000Z", now),
      null
    )
  })
})

describe("formatAbsoluteTime", () => {
  it("formats a readable stamp", () => {
    const label = formatAbsoluteTime("2026-10-14T17:14:20.000Z")
    assert.match(label, /Oct/)
    assert.match(label, /14/)
  })
})
