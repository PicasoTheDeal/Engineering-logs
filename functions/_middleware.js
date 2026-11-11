// Injects per-post Open Graph / Twitter tags into /post.html?id=... so link
// previews (Telegram, Discord, X, Slack…) show the post's title and excerpt.
// Scrapers don't run JS, so this has to happen at the edge.
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (url.pathname !== "/post.html") return next();

  const id = url.searchParams.get("id");
  const res = await next();
  if (!id || !/^[\w.-]+$/.test(id)) return res;

  let log = null;
  try {
    const r = await env.ASSETS.fetch(new URL(`/posts/${encodeURIComponent(id)}.json`, url));
    if (r.ok) log = await r.json();
  } catch (_) {}
  if (!log) return res;

  const title = String(log.title || "Log").replace(/\*/g, "");
  const desc = String(log.excerpt || "").trim() || "Engineering log from Tetstack.";
  const page = `https://logs.tetstack.dev/post.html?id=${encodeURIComponent(id)}`;
  const set = {
    'meta[name="description"]': desc,
    'meta[property="og:title"]': `${title} — Tetstack`,
    'meta[property="og:description"]': desc,
    'meta[property="og:url"]': page,
    'meta[name="twitter:title"]': `${title} — Tetstack`,
    'meta[name="twitter:description"]': desc,
  };

  let rw = new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(`${title} — Tetstack`); } })
    .on('link[rel="canonical"]', { element(e) { e.setAttribute("href", page); } });
  for (const [sel, val] of Object.entries(set)) {
    rw = rw.on(sel, { element(e) { e.setAttribute("content", val); } });
  }
  return rw.transform(res);
}
