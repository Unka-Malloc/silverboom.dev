# Silverboom documentation

The site is a single static page with no build step:

- `index.html` — structure and copy: the BOOM! hero, the projects grid, the
  architecture section, and the start-with section.
- `site.css` — the dark-metal silver design system.
- `site.js` — card connectors and interactions.
- `assets/fonts/` — self-hosted Albert Sans (OFL, provenance in
  `sources.json`).
- `favicon.svg` — mark.
- `dns/` — reviewed Cloudflare DNS import for `silverboom.dev`.
- `tests/` — the Playwright suite driving the rendered page.
- `package.json` / `package-lock.json` — the pinned `@playwright/test`
  toolchain (`npm test` runs the suite).
- `playwright.config.js` — serves the repository root on `127.0.0.1:8973`
  while the suite runs.

Member repository links point at `github.com/Unka-Malloc`.

## Tests

Node.js 20 or newer is required. From the repository root:

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` serves the repository root at `http://127.0.0.1:8973` (see
`playwright.config.js`) and exercises the page in Chromium.

## Asset cache token

`site.css` and `site.js` are referenced with a shared `?v=` token that
busts caches on release. Whenever a versioned asset changes, advance the
token on every `?v=` reference in `index.html` — a stale token leaves
cached visitors running old CSS or JS against new markup.
