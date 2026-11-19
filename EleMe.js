(() => {
  const url = $request.url || "";
  const isBottomTab = /mtop\.alsc\.eleme\.bottomtab/i.test(url);
  const isDorange = /dorangesource\.alicdn\.com\/.*\.json/i.test(url);
  if (!isBottomTab && !isDorange) { $done({}); return; }
  let json = null;
  try {
    json = JSON.parse($response.body);
  } catch (e) {
    $done({});
    return;
  }
  /* 动态资源里先看清是哪个配置 */
  if (isDorange) {
    const nm = (json && (json.name || json.resourceId)) || "";
    if (!/tab/i.test(String(nm)) && JSON.stringify(json).indexOf("tab") < 0) {
      $done({});   // 跟 tab 无关的资源不碰
      return;
    }
    console.log("SHANGOU RES " + nm);
  } else {
    console.log("SHANGOU START " + url.split("?")[0]);
  }
  const DEFAULT_DROP = ["AI点外卖", "AI点餐", "AI 点外卖", "AI 点餐"];
  let keep = null, drop = null;
  try {
    if (typeof $argument !== "undefined" && $argument) {
      const arg = typeof $argument === "string" ? JSON.parse($argument) : $argument;
      if (arg && Array.isArray(arg.keep)) keep = arg.keep.map(String);
      if (arg && Array.isArray(arg.drop)) drop = arg.drop.map(String);
    }
  } catch (e) { console.log("SHANGOU 参数解析失败: " + (e && e.message)); }
  if (!keep && !drop) drop = DEFAULT_DROP;
  function titleOf(o) {
    if (!o || typeof o !== "object") return "";
    const keys = ["name", "title", "tabName", "text", "showText", "tabTitle", "itemName", "label", "desc"];
    for (let i = 0; i < keys.length; i++) {
      const v = o[keys[i]];
      if (typeof v === "string" && v) return v;
    }
    return "";
  }
  function codeOf(o) {
    if (!o || typeof o !== "object") return "";
    const keys = ["tabCode", "code", "tabKey", "key", "bizType", "tabType", "type", "link", "url", "scheme", "value"];
    for (let i = 0; i < keys.length; i++) {
      const v = o[keys[i]];
      if (typeof v === "string" && v) return v;
    }
    return "";
  }
  function isAiTab(t, c) {
    const s = (t || "") + " " + (c || "");
    if (/(^|[^A-Za-z])AI\s*点/i.test(s)) return true;
    if (/点(外卖|餐)/.test(t) && /ai/i.test(c)) return true;
    if (/点(外卖|餐)/.test(t) && /ai/i.test(t)) return true;
    return false;
  }
  function matchAny(hay, list) {
    for (let i = 0; i < list.length; i++) {
      const k = list[i];
      if (!k) continue;
      if (hay === k || hay.indexOf(k) >= 0) return true;
    }
    return false;
  }
  function shouldDrop(t, c) {
    if (isAiTab(t, c)) return true;
    if (keep && keep.length) return !(matchAny(t, keep) || matchAny(c, keep));
    if (drop && drop.length) return matchAny(t, drop) || matchAny(c, drop);
    return false;
  }
  const names = [], sampleKeys = [];
  let removed = 0;
  function walk(node) {
    if (Array.isArray(node)) {
      const out = [];
      for (let i = 0; i < node.length; i++) {
        const it = node[i];
        if (it && typeof it === "object" && !Array.isArray(it)) {
          const t = titleOf(it), c = codeOf(it);
          if (t || c) {
            if (t) names.push(t);
            if (sampleKeys.length < 4) sampleKeys.push(t + " => " + Object.keys(it).slice(0, 8).join(","));
            if (shouldDrop(t, c)) { removed++; continue; }
          }
        }
        out.push(walk(it));
      }
      return out;
    }
    if (node && typeof node === "object") {
      for (const k in node) node[k] = walk(node[k]);
      return node;
    }
    return node;
  }
  walk(json);
  console.log("SHANGOU tabs=" + names.join("|"));
  console.log("SHANGOU 候选=" + names.length + " 删除=" + removed);
  if (removed === 0 && sampleKeys.length) {
    console.log("SHANGOU 未删中，字段样例: " + sampleKeys.join(" ; "));
  }
  if (removed > 0) $done({ body: JSON.stringify(json) });
  else $done({});
})();
