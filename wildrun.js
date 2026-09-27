// wildrun.js：按处理预算处理并留账
import { matchOf, seenBefore } from "./wild.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  const src = spec || {};
  return {
    pattern: src.pattern_error_code || "E_BAD_PATTERN",
    dup: src.dup_error_code || "E_DUP_REQUEST",
    event: src.event_error_code || "E_BAD_EVENT"
  };
}

function checkEvent(event, codeSet) {
  if (!event || typeof event !== "object" || Array.isArray(event)
      || event.kind !== "match" || typeof event.text !== "string") {
    fail(codeSet.event, "bad event");
  }
  if (typeof event.pattern !== "string" || event.pattern.length === 0) {
    fail(codeSet.pattern, "bad pattern");
  }
}

function pairKey(pattern, text) {
  return "pair:" + JSON.stringify([pattern, text]);
}

function eventKey(event) {
  if (event && event.id !== undefined && event.id !== null) return "id:" + String(event.id);
  return pairKey(event.pattern, event.text);
}

function copyState(state) {
  const src = state || {};
  return {
    results: Array.isArray(src.results) ? src.results.slice() : [],
    ledger: Array.isArray(src.ledger) ? src.ledger.slice() : [],
    applied: Array.isArray(src.applied) ? src.applied.slice() : []
  };
}

export function step(spec) {
  const codeSet = codes(spec);
  const state = copyState(spec && spec.state);
  const events = Array.isArray(spec && spec.events) ? spec.events : [];
  let budget = typeof (spec && spec.budget) === "number" ? spec.budget : 0;
  let served = 0;
  for (const event of events) {
    checkEvent(event, codeSet);
    if (state.applied.indexOf(eventKey(event)) !== -1) continue;
    if (budget <= 0) {
      state.ledger.push([event.kind, event.pattern, event.text]);
      continue;
    }
    if (seenBefore(state.results, event.pattern, event.text)) {
      fail(codeSet.dup, "duplicate request");
    }
    state.results.push([event.pattern, event.text, matchOf(event.pattern, event.text)]);
    state.applied.push(eventKey(event));
    budget -= 1;
    served += 1;
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) { return entry.slice(); }),
    judged: served,
    judged_bound: events.length
  };
}

function orderByEvents(results, events) {
  if (!Array.isArray(events)) return results;
  const rest = results.slice();
  const ordered = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const at = rest.findIndex(function (row) {
      return row[0] === event.pattern && row[1] === event.text;
    });
    if (at !== -1) ordered.push(rest.splice(at, 1)[0]);
  }
  return ordered.concat(rest);
}

export function close(spec) {
  const codeSet = codes(spec);
  const state = copyState(spec && spec.state);
  const events = Array.isArray(spec && spec.events) ? spec.events : [];
  const claimed = events.map(function () { return false; });
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of pending) {
    if (!Array.isArray(entry) || entry[0] !== "match" || typeof entry[2] !== "string") {
      fail(codeSet.event, "bad event");
    }
    if (typeof entry[1] !== "string" || entry[1].length === 0) {
      fail(codeSet.pattern, "bad pattern");
    }
    const pattern = entry[1];
    const text = entry[2];
    const at = events.findIndex(function (event, index) {
      return !claimed[index] && event && event.pattern === pattern && event.text === text;
    });
    const key = at === -1 ? pairKey(pattern, text) : eventKey(events[at]);
    if (at !== -1) claimed[at] = true;
    if (state.applied.indexOf(key) === -1) state.applied.push(key);
    if (seenBefore(state.results, pattern, text)) continue;
    state.results.push([pattern, text, matchOf(pattern, text)]);
    catchup += 1;
  }
  state.results = orderByEvents(state.results, events);
  return { state: state, catchup: catchup };
}
