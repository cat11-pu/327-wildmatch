// wildrun.js：按处理预算处理并留账
import { matchOf, seenBefore } from "./wild.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function forkState(spec) {
  const state = spec.state || {};
  return {
    results: (state.results || []).slice(),
    ledger: (state.ledger || []).slice(),
    applied: (state.applied || []).slice()
  };
}

export function step(spec) {
  const state = forkState(spec);
  const events = spec.events || [];
  let budget = typeof spec.budget === "number" ? spec.budget : 0;
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  const patternCode = spec.pattern_error_code || "E_BAD_PATTERN";
  const dupCode = spec.dup_error_code || "E_DUP_REQUEST";

  // 先校验，与预算无关：事件结构不合法报 E_BAD_EVENT，模式不是非空字符串报 E_BAD_PATTERN。
  for (const event of events) {
    if (!event || typeof event !== "object" || event.kind !== "match"
        || typeof event.pattern !== "string" || typeof event.text !== "string") {
      fail(eventCode, "事件结构不合法");
    }
    if (event.pattern.length === 0) {
      fail(patternCode, "模式不是非空字符串");
    }
  }

  const carried = state.ledger.length;
  let served = 0;

  const apply = function (pattern, text) {
    state.results.push([pattern, text, matchOf(pattern, text)]);
    state.applied.push([pattern, text]);
    served += 1;
    budget -= 1;
  };

  // 上一轮压在账上的事件先处理，共用本轮预算。
  while (state.ledger.length > 0 && budget > 0) {
    const entry = state.ledger.shift();
    apply(entry[1], entry[2]);
  }

  for (const event of events) {
    const already = state.applied.some(function (row) {
      return row[0] === event.pattern && row[1] === event.text;
    });
    if (already) {
      continue;
    }
    if (budget > 0) {
      if (seenBefore(state.results, event.pattern, event.text)) {
        fail(dupCode, "同一对模式与文本已经算过");
      }
      apply(event.pattern, event.text);
    } else {
      state.ledger.push([event.kind, event.pattern, event.text]);
    }
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: served,
    judged_bound: events.length + carried
  };
}

export function close(spec) {
  const state = forkState(spec);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const entry = state.ledger.shift();
    state.results.push([entry[1], entry[2], matchOf(entry[1], entry[2])]);
    state.applied.push([entry[1], entry[2]]);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
