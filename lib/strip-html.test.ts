import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { stripHtml, truncate } from "./strip-html"

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    assert.equal(
      stripHtml("<p>Hello &amp; <strong>world</strong></p>"),
      "Hello & world"
    )
  })

  it("handles empty input", () => {
    assert.equal(stripHtml(""), "")
    assert.equal(stripHtml(null), "")
  })
})

describe("truncate", () => {
  it("shortens long text with an ellipsis", () => {
    const out = truncate("a".repeat(50), 20)
    assert.equal(out.endsWith("…"), true)
    assert.ok(out.length <= 20)
  })
})
