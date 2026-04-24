# Church locale router (static prototype)

This is a **pure static** single-page site that:
- Welcomes the user
- Lets them select a **language**
- Routes them to a matching destination URL from `data/destinations.json`

## Run locally

Because this uses `fetch()` to load `data/destinations.json`, you should serve it with a small static server (opening the HTML file directly may be blocked by the browser).

### Option A: VS Code / Cursor Live Server
- Install “Live Server”
- Right-click `index.html` → **Open with Live Server**

### Option B: Python (if installed)

```bash
python -m http.server 5173
```

Then open `http://localhost:5173/church-locale-router/`.

## Update destinations

Edit `data/destinations.json` entries like:

```json
{ "language": "en", "label": "English", "url": "https://…" }
```

## Next.js upgrade path (when npm is available)

If you install **Node.js LTS** (includes `npm`) and optionally **Git**, we can migrate this into a Next.js static export app and keep the same data file + matching logic.

