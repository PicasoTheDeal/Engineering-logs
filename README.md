# Engineering Logs

A minimalist, high-performance log stream engine built with vanilla frontend components and an automated administration pipeline. Instead of manual JSON curation, content mutations are managed via an integrated administrative control panel authenticated via secure token validation.

## Page Access Matrix

| Path | Route Type | Operational Purpose |
| :--- | :--- | :--- |
| / | Public | Main telemetry dashboard. Dynamically maps out the entire list of publications and populates the runtime clusters navigation drawer. |
| /post?id=post-id | Public | Targeted log reader. Intercepts the unique ID parameter from the URL query string to match and parse data. |
| /admin | Restrictive | Administrative control deck. Handles structural creation, parsing, payload initialization, and log deprecation. |

## Core Architecture and Execution Flow

The engine shifts processing weight to the client and edge to maintain a near-zero infrastructure footprint:

* Automated Mutations: Content is never manually injected into raw source code files. The admin page interface routes creation and deletion requests directly through edge workers or dynamic route handlers.
* Token Authentication: Data persistence and write operations require an explicit handshake validated by an internal environment variable (AUTH_SECRET). If the provided client token does not match the secret token at the edge, the execution block is terminated instantly with a 401 response.
* Cross-Origin Streaming (CORS): The explicit _headers profile configures access controls on target files, letting separate systems (like your main portfolio interface) transparently query down live status metadata without running into browser-side resource blocks.

## Local Sandbox Deployment

To launch and run the entire environment locally exactly as it operates inside the production edge runtime, execute the following commands using the native node package runner:

### 1. Initialize Project Directory
```bash
git clone [https://github.com/PicasoTheDeal/engineering-logs.git](https://github.com/PicasoTheDeal/engineering-logs.git)
cd engineering-logs
```

### 2. Provision Local Environment Variables

Create a local .dev.vars file in the root directory to store your operational keys for local testing:
```Plaintext

AUTH_SECRET=your_secure_development_token_here
```

### 3. Spin Up Cloudflare Production Simulation

Fire up the local edge emulator using Wrangler. This sets up local listeners without globally polluting your system dependencies:
```Bash

npx wrangler pages dev .
```

### 4. Verification

Once running, navigate to the terminal-provided local loopback address:

    Local Application Hub: http://localhost:8788

    Local Admin Interface: http://localhost:8788/admin

## Deployment and Forking Guide

If you want to use this architecture for your own logs or portfolio:

    Fork the Repository: Click the Fork button at the top right of this GitHub page.

    Link to Cloudflare: Go to your Cloudflare Dashboard, navigate to Pages, click Connect to Git, and select your forked repository. Leave the build command and build output directory empty as it is a static site.

    Configure Environment Secret: In your Cloudflare Pages project settings, add an environment variable named AUTH_SECRET matching the key you use to authenticate updates inside your /admin console and GITHUB_TOKEN so it can update that repo.

    Link to an External Portfolio: If you want another website to fetch your latest blog post (e.g., a Latest Log widget on your main portfolio), the included _headers file already enables CORS. Simply fetch https://your-domain.pages.dev/posts.json from your other site.
