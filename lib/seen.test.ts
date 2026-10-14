import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { markManySeen, markSeen, markUnseen } from "./seen"

describe("seen set helpers", () => {
  it("marks an id seen without mutating the original set", () => {
    const base = new Set(["a"])
    const next = markSeen(base, "b")
    assert.equal(base.has("b"), false)
    assert.equal(next.has("a"), true)
    assert.equal(next.has("b"), true)
  })

  it("unmarks an id", () => {
    const next = markUnseen(new Set(["a", "b"]), "a")
    assert.deepEqual([...next], ["b"])
  })

  it("marks many ids at once", () => {
    const next = markManySeen(new Set(["a"]), ["b", "c", "a"])
    assert.equal(next.size, 3)
  })
})
