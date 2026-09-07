# Fresh.OS — Frontend

Static HTML + Tailwind (CDN) frontend for the Food Freshness Monitoring Platform.
No build step — every page is plain HTML.

## Pages & flow

```
index.html          Landing page (marketing site)
  -> sign-in.html    Login / Signup (submitting either form goes to dashboard.html — no backend yet)
      -> dashboard.html      Main app home
          -> upload-scan.html   Upload/scan a food photo, run analysis
          -> inventory.html     Browse inventory, click a card -> item-details.html
          -> item-details.html  Single item freshness breakdown
          -> analytics.html     Placeholder (wire up charts once backend/API exists)
          -> settings.html      Placeholder
          -> support.html       Placeholder
```

Every sidebar / nav link across every page now points to a real file — no more `href="#"`
dead links (except a few footer legal links like "Privacy Policy" which aren't part of the
project scope).

## Run it locally

No install needed — just serve the folder so the browser fetches files over `http://`
instead of `file://` (some things like `fetch`/relative asset paths behave oddly over
`file://`).

**Option A — Python (already on most machines):**
```bash
cd fresh-os-site
python3 -m http.server 8000
```
Then open `http://localhost:8000/index.html`

**Option B — VS Code:**
Install the "Live Server" extension, right-click `index.html` → "Open with Live Server".

**Option C — Node:**
```bash
npx serve fresh-os-site
```

## Deploy it as a real website (free)

Since this is 100% static, no server-side code needed:

1. **Netlify (easiest):** go to app.netlify.com/drop and drag the whole `fresh-os-site`
   folder in. You get a live URL in seconds.
2. **Vercel:** `npx vercel` inside the folder, follow the prompts.
3. **GitHub Pages:** push this folder to a GitHub repo, then in repo Settings → Pages,
   set source to the branch/folder. Your site will be live at
   `https://<username>.github.io/<repo>/index.html`.

Any of these give you a shareable link for your demo — no AWS/Azure account needed.

## Next steps to make it a real working app

Right now every screen is populated with placeholder/sample data (hardcoded in the HTML).
To wire it to your actual FastAPI backend:

1. Replace hardcoded inventory items / dashboard numbers with `fetch()` calls to your
   API endpoints (e.g. `GET /api/inventory`, `GET /api/dashboard/summary`).
2. In `upload-scan.html`, the `runAnalysis()` function currently just animates the UI —
   swap it to POST the selected image + form fields to your `/predict-freshness`
   endpoint and render the real response instead of the static "94% Fresh" numbers.
3. Sign-in currently redirects on any submit with no validation — wire it to your
   `/auth/login` and `/auth/signup` endpoints, store the JWT (e.g. in memory or an
   httpOnly cookie via your backend, not localStorage), and gate the app pages on it.
4. `analytics.html` / `settings.html` / `support.html` are placeholders — build these
   out once you have real data/settings endpoints to back them.
