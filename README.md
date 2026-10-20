# Engineering Logs

Log stream engine. Vanilla frontend, edge worker for mutations, Git as the DB.
No manual JSON the admin console commits every write through a Pages Function.

## Routes

| Path | Access | What it does |
| :--- | :--- | :--- |
| `/` | Public | Runtime dashboard. Reads `posts.json`, renders the stream, tags, sidebar. |
| `/post.html?id=node-id` | Public | Node reader. Parses the id, renders markdown, builds TOC + progress. |
| `/admin/` | Restrictive | Publish console. Compose → validate key → commit. |
| `/admin/delete.html` | Restrictive | Purge console. Kill a node, prune the manifest. |

## How it moves

- **Writes only through the edge.** Both consoles POST/DELETE to `/api/publish`.
  That function commits to the repo via the GitHub Contents API.
- **Manifest stays synced.** Every publish/purge rewrites `posts.json` in the
  same call. Updates fetch the current `sha` first, so re-publishing a node
  doesn't 422.
- **Key check happens first.** Mismatched `ADMIN_SECRET` → 401 before any GitHub
  call.
- **CORS is on.** `_headers` opens `posts.json` so your portfolio can pull live
  metadata.

## Storage

```JSON
posts.json → [{ id, title, category, readTime, date, excerpt }]
posts/{id}.json → same fields + { content } (markdown)
```

`date` is ISO 8601. Dashboard renders `YYYY/MM/DD`; no time-of-day shown.

## Local

```bash
git clone https://github.com/PicasoTheDeal/engineering-logs.git
cd engineering-logs
```

### .dev.vars:

```plaintext

ADMIN_SECRET=dev_key_here
GITHUB_TOKEN=ghp_xxx
```
`GITHUB_TOKEN` needs Contents: Read and write (fine-grained) or `repo`
scope (classic). Selected-repo tokens must include this repo.

```bash
npx wrangler pages dev .
```

Hub: http://localhost:8788

Publish: http://localhost:8788/admin/

Purge: http://localhost:8788/admin/delete.html


## Stack

Vanilla HTML/CSS/JS · marked for markdown · one Pages Function · Git as
storage · procedural dune canvas (no image assets).
text.