import test from "node:test";
import assert from "node:assert/strict";

test("controlled real test failure for diagnostics verification", () => {
  assert.equal(1, 2, "intentional assertion mismatch from the Node test runner");
});
