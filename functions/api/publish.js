export async function onRequest(context) {
    const { request, env } = context;
    const repo = "PicasoTheDeal/engineering-logs";
    const token = env.GITHUB_TOKEN;

    try {
        // --- HANDLER: DELETE (Purge Node) ---
        if (request.method === "DELETE") {
            const { secret, id } = await request.json();
            if (!secret || secret !== env.ADMIN_SECRET) {
                return new Response(JSON.stringify({ error: "Access token validation failure." }), { status: 401 });
            }

            // 1. Delete the post file
            await fetch(`https://api.github.com/repos/${repo}/contents/posts/${id}.json`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `system(log): purging node ${id}` })
            });

            // 2. Remove from manifest
            const manifestGet = await fetch(`https://api.github.com/repos/${repo}/contents/posts.json`, {
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker' }
            });
            const manifestData = await manifestGet.json();
            let manifest = JSON.parse(decodeURIComponent(escape(atob(manifestData.content))));
            manifest = manifest.filter(post => post.id !== id);

            await fetch(`https://api.github.com/repos/${repo}/contents/posts.json`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "system(manifest): prune log index",
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2)))),
                    sha: manifestData.sha
                })
            });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        // --- HANDLER: POST (Publish Node) ---
        if (request.method === "POST") {
            const body = await request.json();
            const { secret, id, title, category, readTime, excerpt, content } = body;

            if (!secret || secret !== env.ADMIN_SECRET) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
            
            const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const postPayload = { id, title, category, readTime, date, excerpt, content };

            // Push File
            await fetch(`https://api.github.com/repos/${repo}/contents/posts/${id}.json`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `system(log): write ${id}`, content: btoa(unescape(encodeURIComponent(JSON.stringify(postPayload, null, 2)))) })
            });

            // Update Manifest
            const manifestGet = await fetch(`https://api.github.com/repos/${repo}/contents/posts.json`, { headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker' } });
            const manifestData = await manifestGet.json();
            let list = JSON.parse(decodeURIComponent(escape(atob(manifestData.content))));
            
            list = list.filter(item => item.id !== id);
            list.unshift({ id, title, category, readTime, date, excerpt });

            await fetch(`https://api.github.com/repos/${repo}/contents/posts.json`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Cloudflare-Pages-Worker', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "system(manifest): rebuild index", content: btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2)))), sha: manifestData.sha })
            });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e) {
        return new Response(JSON.stringify({ error: "System fault", details: e.message }), { status: 500 });
    }
}