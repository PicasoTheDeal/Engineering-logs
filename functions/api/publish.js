export async function onRequest(context) {
  const { request, env } = context;
  const repo = "PicasoTheDeal/engineering-logs";
  const token = env.GITHUB_TOKEN;

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const GH = `https://api.github.com/repos/${repo}`;
  const ghHeaders = {
    "Authorization": `Bearer ${token}`,
    "User-Agent": "Cloudflare-Pages-Worker",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const gh = async (url, init = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: { ...ghHeaders, ...(init.headers || {}) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`github ${res.status} ${url.replace(GH, "")}: ${text.slice(0, 300)}`);
    }
    return res;
  };

  const b64encode = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  const b64decode = (s) =>
    new TextDecoder().decode(
      Uint8Array.from(atob(String(s).replace(/\s/g, "")), (c) => c.charCodeAt(0))
    );

  const getSha = async (path) => {
    const res = await fetch(`${GH}/contents/${path}`, { headers: ghHeaders });
    if (res.status === 404) return null;
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`github ${res.status} read ${path}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return { sha: data.sha, content: b64decode(data.content || "") };
  };

  try {
    if (!token) {
      return json({ error: "Server misconfigured", details: "GITHUB_TOKEN env var is not set" }, 500);
    }

    {
      const probe = await fetch(GH, { headers: ghHeaders });
      if (probe.status === 401) {
        return json({ error: "GitHub auth failed", details: "401 — GITHUB_TOKEN is invalid or expired" }, 502);
      }
      if (probe.status === 404) {
        return json({ error: "GitHub repo not visible", details: `404 — check repo slug "${repo}" and GITHUB_TOKEN scope` }, 502);
      }
      if (!probe.ok) {
        return json({ error: "GitHub probe failed", details: `${probe.status}` }, 502);
      }
    }

    if (request.method === "DELETE") {
      const { secret, id } = await request.json();
      if (!secret || secret !== env.ADMIN_SECRET) {
        return json({ error: "Access token validation failure." }, 401);
      }
      if (!id) return json({ error: "Missing node id" }, 400);

      const existing = await getSha(`posts/${id}.json`);
      if (!existing) return json({ error: `Node "${id}" not found` }, 404);

      await gh(`${GH}/contents/posts/${id}.json`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `system(log): purging node ${id}`,
          sha: existing.sha,
        }),
      });

      const manifest = await getSha("posts.json");
      if (manifest) {
        const list = JSON.parse(manifest.content);
        const next = list.filter((p) => p.id !== id);
        await gh(`${GH}/contents/posts.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "system(manifest): prune log index",
            content: b64encode(JSON.stringify(next, null, 2)),
            sha: manifest.sha,
          }),
        });
      }

      return json({ success: true });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { secret, id, title, category, readTime, excerpt, content } = body;

      if (!secret || secret !== env.ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);
      if (!id || !title || !content) {
        return json({ error: "Missing required fields", details: "id, title, content required" }, 400);
      }

      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const postPayload = { id, title, category, readTime, date, excerpt, content };

      const existing = await getSha(`posts/${id}.json`);
      await gh(`${GH}/contents/posts/${id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `system(log): write ${id}`,
          content: b64encode(JSON.stringify(postPayload, null, 2)),
          ...(existing ? { sha: existing.sha } : {}),
        }),
      });

      const manifest = await getSha("posts.json");
      const list = manifest ? JSON.parse(manifest.content) : [];
      const next = list.filter((item) => item.id !== id);
      next.unshift({ id, title, category, readTime, date, excerpt });

      await gh(`${GH}/contents/posts.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "system(manifest): rebuild index",
          content: b64encode(JSON.stringify(next, null, 2)),
          ...(manifest ? { sha: manifest.sha } : {}),
        }),
      });

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("[publish] fault:", e.stack || e);
    return json({ error: "System fault", details: e.message || String(e) }, 500);
  }
}