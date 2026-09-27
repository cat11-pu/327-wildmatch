import assert from "node:assert";
import { matchOf, seenBefore } from "../wild.js";
import { step, close } from "../wildrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { results: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "match", pattern: "a*", text: "ab" }],
  pattern_error_code: "E_BAD_PATTERN", dup_error_code: "E_DUP_REQUEST",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("matchOf returns a boolean", () => {
  assert.strictEqual(typeof matchOf("a*", "ab"), "boolean");
});

check("seenBefore returns a boolean", () => {
  assert.strictEqual(typeof seenBefore([], "a", "b"), "boolean");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
