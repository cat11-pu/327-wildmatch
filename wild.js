// wild.js：通配匹配（星号匹配任意串、问号匹配一个字符、别的原样对上）
export function matchOf(pattern, text) {
  let p = 0;
  let t = 0;
  let starP = -1;
  let starT = -1;
  while (t < text.length) {
    if (p < pattern.length && (pattern[p] === "?" || pattern[p] === text[t])) {
      p += 1;
      t += 1;
    } else if (p < pattern.length && pattern[p] === "*") {
      starP = p;
      starT = t;
      p += 1;
    } else if (starP !== -1) {
      p = starP + 1;
      starT += 1;
      t = starT;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === "*") p += 1;
  return p === pattern.length;
}

export function seenBefore(results, pattern, text) {
  if (!Array.isArray(results)) return false;
  return results.some(function (row) {
    return Array.isArray(row) && row[0] === pattern && row[1] === text;
  });
}
