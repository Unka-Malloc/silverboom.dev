# Silverboom

Public single-page site for the Silverboom agent-infrastructure matrix — the
shared crates that register, govern and ship agent adapters, runtimes, hooks
and credential custody as one system.

Live site: <https://silverboom.dev>

This static source does not establish an endpoint, product release, support
commitment, or hosted operation.

## Run

No build step. Serve the repository root with any static file server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. `index.html`, `site.css`, `site.js`,
`favicon.svg` and `assets/fonts/` are referenced as root-relative paths.

## Publication

GitHub Pages serves `main` at the repository root; the `CNAME` file sets the
custom domain. DNS lives in Cloudflare as DNS-only records — the reviewed
BIND import is kept at `dns/cloudflare-github-pages.txt`.

## Documentation

See [docs/README.md](docs/README.md).
